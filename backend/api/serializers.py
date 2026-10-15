from rest_framework import serializers
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
from .services import ResourceValidationService


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', '')
        )
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'email', 'self_study_start_time', 'self_study_end_time',
            'timezone_str', 'saturday_mode', 'daily_study_target_minutes', 'theme_preference',
            'created_at', 'updated_at'
        ]


class SubjectSerializer(serializers.ModelSerializer):
    total_focused_study_seconds = serializers.SerializerMethodField(read_only=True)
    outstanding_backlog_minutes = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'color', 'daily_target_minutes', 'priority',
            'is_archived', 'created_at', 'updated_at',
            'total_focused_study_seconds', 'outstanding_backlog_minutes'
        ]

    def get_total_focused_study_seconds(self, obj):
        sessions = obj.focus_sessions.all()
        return sum(s.accumulated_study_seconds for s in sessions)

    def get_outstanding_backlog_minutes(self, obj):
        backlogs = obj.backlogs.filter(status__in=['OUTSTANDING', 'PARTIALLY_RESOLVED'])
        return sum(b.remaining_minutes for b in backlogs)


class TimetableEntrySerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_color = serializers.CharField(source='subject.color', read_only=True)

    class Meta:
        model = TimetableEntry
        fields = [
            'id', 'subject', 'subject_name', 'subject_color', 'title',
            'day_of_week', 'start_time', 'end_time', 'classroom', 'is_break',
            'created_at', 'updated_at'
        ]


class ScheduleExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleException
        fields = [
            'id', 'date', 'exception_type', 'early_dismissal_time',
            'timetable_entry', 'note', 'created_at'
        ]


class UnavailableTimeBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnavailableTimeBlock
        fields = [
            'id', 'category', 'label', 'start_time', 'end_time',
            'days_of_week', 'is_active', 'created_at'
        ]


class StudyTaskSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_color = serializers.CharField(source='subject.color', read_only=True)

    class Meta:
        model = StudyTask
        fields = [
            'id', 'subject', 'subject_name', 'subject_color', 'title', 'description',
            'due_date', 'planned_minutes', 'priority', 'status',
            'is_college_assignment', 'created_at', 'updated_at'
        ]


class BacklogRecordSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    remaining_minutes = serializers.ReadOnlyField()

    class Meta:
        model = BacklogRecord
        fields = [
            'id', 'subject', 'subject_name', 'date_incurred', 'missed_minutes',
            'resolved_minutes', 'remaining_minutes', 'status', 'reason', 'created_at'
        ]


class StudyPlanSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_color = serializers.CharField(source='subject.color', read_only=True)

    class Meta:
        model = StudyPlan
        fields = [
            'id', 'date', 'subject', 'subject_name', 'subject_color',
            'allocated_minutes', 'backlog_minutes', 'allocation_reason',
            'is_confirmed', 'status', 'created_at', 'updated_at'
        ]


class StudySegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudySegment
        fields = [
            'id', 'segment_index', 'segment_type', 'duration_seconds',
            'completed_seconds', 'is_completed'
        ]


class SessionEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionEvent
        fields = ['id', 'event_type', 'timestamp', 'metadata']


class FocusSessionSerializer(serializers.ModelSerializer):
    segments = StudySegmentSerializer(many=True, read_only=True)
    events = SessionEventSerializer(many=True, read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_color = serializers.CharField(source='subject.color', read_only=True)

    class Meta:
        model = FocusSession
        fields = [
            'id', 'client_session_id', 'subject', 'subject_name', 'subject_color',
            'task', 'total_block_minutes', 'state', 'current_segment_index',
            'accumulated_study_seconds', 'accumulated_break_seconds',
            'current_segment_started_at', 'started_at', 'completed_at',
            'last_state_change', 'created_at', 'segments', 'events'
        ]


class StudyResourceSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = StudyResource
        fields = [
            'id', 'name', 'category', 'url', 'is_approved', 'is_enabled_for_focus',
            'subject', 'subject_name', 'sort_order', 'created_at', 'updated_at'
        ]

    def validate_url(self, value):
        if value:
            norm = ResourceValidationService.validate_and_normalize(value)
            return norm['normalized_url']
        return value


class StudyMaterialSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'subject', 'subject_name', 'title', 'description',
            'file', 'file_url', 'file_type', 'file_size_bytes',
            'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class StudyNoteSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = StudyNote
        fields = [
            'id', 'subject', 'subject_name', 'title', 'content',
            'questions_solved_count', 'checklist_items', 'revision_status',
            'created_at', 'updated_at'
        ]


class SyncOperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncOperation
        fields = ['id', 'operation_id', 'entity_type', 'action', 'payload', 'applied_at']
