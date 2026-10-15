import uuid
from datetime import datetime, date, timedelta, time
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User

from .models import (
    UserProfile,
    Subject,
    TimetableEntry,
    ScheduleException,
    UnavailableTimeBlock,
    StudyTask,
    StudyPlan,
    BacklogRecord,
    FocusSession,
    StudySegment,
    SessionEvent,
    StudyResource,
    StudyMaterial,
    StudyNote,
    SyncOperation,
)
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    SubjectSerializer,
    TimetableEntrySerializer,
    ScheduleExceptionSerializer,
    UnavailableTimeBlockSerializer,
    StudyTaskSerializer,
    StudyPlanSerializer,
    BacklogRecordSerializer,
    FocusSessionSerializer,
    StudyResourceSerializer,
    StudyMaterialSerializer,
    StudyNoteSerializer,
    SyncOperationSerializer,
)
from .services import (
    TimerScheduleService,
    AvailableTimeService,
    BacklogService,
    ResourceValidationService,
)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(UserProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TimetableEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TimetableEntry.objects.filter(user=self.request.user)
        day = self.request.query_params.get('day')
        if day is not None:
            qs = qs.filter(day_of_week=int(day))
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ScheduleExceptionViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleExceptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ScheduleException.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UnavailableTimeBlockViewSet(viewsets.ModelViewSet):
    serializer_class = UnavailableTimeBlockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UnavailableTimeBlock.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AvailableTimeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        today = date.today()
        weekday = today.weekday()

        # Check for schedule exceptions (e.g. Early dismissal)
        exceptions = ScheduleException.objects.filter(user=request.user, date=today)
        is_holiday = exceptions.filter(exception_type='HOLIDAY').exists()
        early_dismissal = exceptions.filter(exception_type='EARLY_DISMISSAL').first()

        commitments = []

        # If not holiday, include college hours if today is a college day
        is_college_day = True
        if weekday == 5 and profile.saturday_mode != 'COLLEGE':
            is_college_day = False
        elif weekday == 6:
            is_college_day = False

        if is_college_day and not is_holiday:
            # Default college hours 9:00 AM to 4:00 PM (16:00), or early dismissal
            end_college = early_dismissal.early_dismissal_time if early_dismissal and early_dismissal.early_dismissal_time else time(16, 0)
            commitments.append({
                'start_time': time(9, 0),
                'end_time': end_college,
                'label': 'College Timetable',
            })

        # Add user's configured unavailable blocks
        user_blocks = UnavailableTimeBlock.objects.filter(user=request.user, is_active=True)
        for b in user_blocks:
            if not b.days_of_week or weekday in b.days_of_week:
                commitments.append({
                    'start_time': b.start_time,
                    'end_time': b.end_time,
                    'label': b.label,
                })

        result = AvailableTimeService.calculate_available_time(
            profile.self_study_start_time,
            profile.self_study_end_time,
            commitments
        )
        return Response(result)


class StudyTaskViewSet(viewsets.ModelViewSet):
    serializer_class = StudyTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudyTask.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BacklogViewSet(viewsets.ModelViewSet):
    serializer_class = BacklogRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BacklogRecord.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def reallocate(self, request):
        # Calculate available minutes for user
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        avail_resp = AvailableTimeView().get(request).data
        avail_mins = avail_resp.get('available_minutes', 300)

        subjects = Subject.objects.filter(user=request.user, is_archived=False)
        subjects_data = []
        for s in subjects:
            backlog_mins = sum(b.remaining_minutes for b in s.backlogs.filter(status__in=['OUTSTANDING', 'PARTIALLY_RESOLVED']))
            subjects_data.append({
                'id': s.id,
                'name': s.name,
                'priority': s.priority,
                'daily_target_minutes': s.daily_target_minutes,
                'outstanding_backlog_minutes': backlog_mins,
            })

        plan = BacklogService.calculate_reallocation(subjects_data, avail_mins)
        return Response(plan)


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudyPlan.objects.filter(user=self.request.user)
        plan_date = self.request.query_params.get('date')
        if plan_date:
            qs = qs.filter(date=plan_date)
        return qs

    @action(detail=False, methods=['post'])
    def confirm_plan(self, request):
        """
        Confirms or updates study plans for a date without silent loss.
        """
        plans_data = request.data.get('plans', [])
        plan_date = request.data.get('date', str(date.today()))
        created_plans = []

        with transaction.atomic():
            for p in plans_data:
                subject_id = p.get('subject_id')
                allocated = p.get('allocated_minutes', 60)
                backlog = p.get('backlog_minutes', 0)
                reason = p.get('allocation_reason', '')

                plan, _ = StudyPlan.objects.update_or_create(
                    user=request.user,
                    date=plan_date,
                    subject_id=subject_id,
                    defaults={
                        'allocated_minutes': allocated,
                        'backlog_minutes': backlog,
                        'allocation_reason': reason,
                        'is_confirmed': True,
                    }
                )
                created_plans.append(plan)

        return Response(StudyPlanSerializer(created_plans, many=True).data)


class FocusSessionViewSet(viewsets.ModelViewSet):
    serializer_class = FocusSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FocusSession.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Recovers the active session across refreshes, browser restarts, and device sleep.
        """
        active_session = FocusSession.objects.filter(
            user=request.user,
            state__in=['STUDYING', 'BREAK', 'PAUSED']
        ).first()

        if active_session:
            return Response(FocusSessionSerializer(active_session).data)
        return Response({'active': False, 'message': 'No active session.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def start(self, request):
        subject_id = request.data.get('subject_id')
        total_minutes = int(request.data.get('total_block_minutes', 60))
        task_id = request.data.get('task_id')
        client_session_id = request.data.get('client_session_id', str(uuid.uuid4()))

        # If there is already an active session, return it to prevent duplicate sessions
        existing = FocusSession.objects.filter(
            user=request.user,
            state__in=['STUDYING', 'BREAK', 'PAUSED']
        ).first()
        if existing:
            return Response(FocusSessionSerializer(existing).data, status=status.HTTP_200_OK)

        subject = Subject.objects.get(id=subject_id, user=request.user)

        # Generate schedule via deterministic algorithm
        try:
            segments_data = TimerScheduleService.generate_schedule(total_minutes)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            session = FocusSession.objects.create(
                user=request.user,
                client_session_id=client_session_id,
                subject=subject,
                task_id=task_id,
                total_block_minutes=total_minutes,
                state='STUDYING',
                current_segment_index=0,
                started_at=timezone.now(),
                current_segment_started_at=timezone.now()
            )

            for seg in segments_data:
                StudySegment.objects.create(
                    session=session,
                    segment_index=seg['segment_index'],
                    segment_type=seg['segment_type'],
                    duration_seconds=seg['duration_seconds']
                )

            SessionEvent.objects.create(
                session=session,
                event_type='STARTED',
                timestamp=timezone.now(),
                metadata={'total_minutes': total_minutes}
            )

        return Response(FocusSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        session = self.get_object()
        if session.state not in ['STUDYING', 'BREAK']:
            return Response({'error': f"Cannot pause session in {session.state} state."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if session.current_segment_started_at:
            delta = int((now - session.current_segment_started_at).total_seconds())
            if session.state == 'STUDYING':
                session.accumulated_study_seconds += delta
            elif session.state == 'BREAK':
                session.accumulated_break_seconds += delta

        session.state = 'PAUSED'
        session.current_segment_started_at = None
        session.save()

        SessionEvent.objects.create(
            session=session,
            event_type='PAUSED',
            timestamp=now
        )
        return Response(FocusSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        session = self.get_object()
        if session.state != 'PAUSED':
            return Response({'error': f"Cannot resume session in {session.state} state."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        # Resume study
        session.state = 'STUDYING'
        session.current_segment_started_at = now
        session.save()

        SessionEvent.objects.create(
            session=session,
            event_type='RESUMED',
            timestamp=now
        )
        return Response(FocusSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def enter_break(self, request, pk=None):
        session = self.get_object()
        now = timezone.now()

        if session.current_segment_started_at and session.state == 'STUDYING':
            session.accumulated_study_seconds += int((now - session.current_segment_started_at).total_seconds())

        # Advance to break segment
        session.current_segment_index += 1
        session.state = 'BREAK'
        session.current_segment_started_at = now
        session.save()

        SessionEvent.objects.create(
            session=session,
            event_type='BREAK_ENTERED',
            timestamp=now
        )
        return Response(FocusSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def complete_break(self, request, pk=None):
        session = self.get_object()
        now = timezone.now()

        if session.current_segment_started_at and session.state == 'BREAK':
            session.accumulated_break_seconds += int((now - session.current_segment_started_at).total_seconds())

        # Move to next study segment and STRICTLY pause for manual user resume
        session.current_segment_index += 1
        session.state = 'PAUSED'
        session.current_segment_started_at = None
        session.save()

        SessionEvent.objects.create(
            session=session,
            event_type='BREAK_COMPLETED',
            timestamp=now
        )
        return Response(FocusSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        session = self.get_object()
        now = timezone.now()

        if session.current_segment_started_at:
            delta = int((now - session.current_segment_started_at).total_seconds())
            if session.state == 'STUDYING':
                session.accumulated_study_seconds += delta
            elif session.state == 'BREAK':
                session.accumulated_break_seconds += delta

        session.state = 'COMPLETED'
        session.completed_at = now
        session.current_segment_started_at = None
        session.save()

        SessionEvent.objects.create(
            session=session,
            event_type='COMPLETED',
            timestamp=now,
            metadata={'accumulated_study_seconds': session.accumulated_study_seconds}
        )

        # Mark task as completed if attached
        if session.task:
            session.task.status = 'COMPLETED'
            session.task.save()

        return Response(FocusSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        now = timezone.now()
        session.state = 'CANCELLED'
        session.current_segment_started_at = None
        session.save()

        SessionEvent.objects.create(
            session=session,
            event_type='CANCELLED',
            timestamp=now
        )
        return Response(FocusSessionSerializer(session).data)


class StudyResourceViewSet(viewsets.ModelViewSet):
    serializer_class = StudyResourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudyResource.objects.filter(user=self.request.user)
        focus_only = self.request.query_params.get('focus_only')
        if focus_only in ['true', '1']:
            qs = qs.filter(is_approved=True, is_enabled_for_focus=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_approval(self, request, pk=None):
        resource = self.get_object()
        resource.is_approved = not resource.is_approved
        resource.save()
        return Response(StudyResourceSerializer(resource).data)

    @action(detail=True, methods=['post'])
    def toggle_focus(self, request, pk=None):
        resource = self.get_object()
        resource.is_enabled_for_focus = not resource.is_enabled_for_focus
        resource.save()
        return Response(StudyResourceSerializer(resource).data)


class StudyMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = StudyMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudyMaterial.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES.get('file')
        size = uploaded_file.size if uploaded_file else 0
        serializer.save(user=self.request.user, file_size_bytes=size)


class StudyNoteViewSet(viewsets.ModelViewSet):
    serializer_class = StudyNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudyNote.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        sessions = FocusSession.objects.filter(user=user)
        completed_sessions = sessions.filter(state='COMPLETED')

        today_sessions = completed_sessions.filter(created_at__date=today)
        week_sessions = completed_sessions.filter(created_at__date__gte=seven_days_ago)
        month_sessions = completed_sessions.filter(created_at__date__gte=thirty_days_ago)

        today_study_seconds = sum(s.accumulated_study_seconds for s in today_sessions)
        week_study_seconds = sum(s.accumulated_study_seconds for s in week_sessions)
        month_study_seconds = sum(s.accumulated_study_seconds for s in month_sessions)

        # Subject breakdown
        subject_stats = []
        for s in Subject.objects.filter(user=user):
            subj_sessions = completed_sessions.filter(subject=s)
            secs = sum(sess.accumulated_study_seconds for sess in subj_sessions)
            subject_stats.append({
                'id': s.id,
                'name': s.name,
                'color': s.color,
                'focused_seconds': secs,
                'focused_minutes': round(secs / 60, 1),
                'daily_target_minutes': s.daily_target_minutes,
            })

        # Daily study trend for last 7 days
        daily_trend = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            day_secs = sum(s.accumulated_study_seconds for s in completed_sessions.filter(created_at__date=d))
            daily_trend.append({
                'date': d.strftime('%a, %d %b'),
                'study_minutes': round(day_secs / 60, 1),
            })

        return Response({
            'today_focused_minutes': round(today_study_seconds / 60, 1),
            'today_break_minutes': round(sum(s.accumulated_break_seconds for s in today_sessions) / 60, 1),
            'week_focused_hours': round(week_study_seconds / 3600, 2),
            'month_focused_hours': round(month_study_seconds / 3600, 2),
            'total_completed_sessions': completed_sessions.count(),
            'total_cancelled_sessions': sessions.filter(state='CANCELLED').count(),
            'subject_stats': subject_stats,
            'daily_trend': daily_trend,
        })


class SyncViewSet(viewsets.ModelViewSet):
    serializer_class = SyncOperationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SyncOperation.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def batch_sync(self, request):
        operations = request.data.get('operations', [])
        applied_ops = []

        with transaction.atomic():
            for op in operations:
                op_id = op.get('operation_id')
                # Check for idempotent execution
                if SyncOperation.objects.filter(operation_id=op_id).exists():
                    continue

                new_op = SyncOperation.objects.create(
                    user=request.user,
                    operation_id=op_id,
                    entity_type=op.get('entity_type', 'UNKNOWN'),
                    action=op.get('action', 'CREATE'),
                    payload=op.get('payload', {})
                )
                applied_ops.append(new_op)

        return Response(SyncOperationSerializer(applied_ops, many=True).data, status=status.HTTP_201_CREATED)
