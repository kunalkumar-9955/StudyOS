import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserProfile(models.Model):
    SATURDAY_MODES = [
        ('REST', 'Rest Day'),
        ('COLLEGE', 'College Day'),
        ('SELF_STUDY', 'Flexible Self-Study Day'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    self_study_start_time = models.TimeField(default='16:00:00', help_text="Default 4:00 PM")
    self_study_end_time = models.TimeField(default='02:00:00', help_text="Default 2:00 AM next day")
    timezone_str = models.CharField(max_length=64, default='Asia/Kolkata')
    saturday_mode = models.CharField(max_length=16, choices=SATURDAY_MODES, default='SELF_STUDY')
    daily_study_target_minutes = models.PositiveIntegerField(default=300, help_text="Default 5 hours")
    theme_preference = models.CharField(max_length=16, default='dark')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


class Subject(models.Model):
    PRIORITY_CHOICES = [
        (1, 'High Priority'),
        (2, 'Medium Priority'),
        (3, 'Low Priority'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=16, default='#10b981')
    daily_target_minutes = models.PositiveIntegerField(default=60)
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=2)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['priority', 'name']
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class TimetableEntry(models.Model):
    DAYS_OF_WEEK = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='timetable_entries')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='timetable_entries')
    title = models.CharField(max_length=120, help_text="Lecture title or break description")
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    classroom = models.CharField(max_length=50, blank=True)
    is_break = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f"{self.get_day_of_week_display()}: {self.title} ({self.start_time}-{self.end_time})"


class ScheduleException(models.Model):
    EXCEPTION_TYPES = [
        ('HOLIDAY', 'Holiday / Full Off'),
        ('CANCELLED_LECTURE', 'Cancelled Lecture'),
        ('EARLY_DISMISSAL', 'Early Dismissal'),
        ('SPECIAL_SCHEDULE', 'Special Schedule'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedule_exceptions')
    date = models.DateField()
    exception_type = models.CharField(max_length=32, choices=EXCEPTION_TYPES)
    early_dismissal_time = models.TimeField(null=True, blank=True)
    timetable_entry = models.ForeignKey(TimetableEntry, on_delete=models.CASCADE, null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} - {self.exception_type} ({self.user.username})"


class UnavailableTimeBlock(models.Model):
    CATEGORIES = [
        ('COLLEGE', 'College Hours'),
        ('SLEEP', 'Sleep'),
        ('MEALS', 'Meals'),
        ('BATHING', 'Bathing & Grooming'),
        ('TRAVEL', 'Travel & Commute'),
        ('WALKING', 'Walking & Health'),
        ('PERSONAL', 'Personal Time'),
        ('OTHER', 'Other Commitment'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='unavailable_blocks')
    category = models.CharField(max_length=32, choices=CATEGORIES)
    label = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    days_of_week = models.JSONField(default=list, help_text="List of active days 0-6")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.label} ({self.start_time}-{self.end_time})"


class StudyTask(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('MISSED', 'Missed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_tasks')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    planned_minutes = models.PositiveIntegerField(default=60)
    priority = models.IntegerField(default=2)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='SCHEDULED')
    is_college_assignment = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'priority', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.subject.name}"


class BacklogRecord(models.Model):
    STATUS_CHOICES = [
        ('OUTSTANDING', 'Outstanding'),
        ('PARTIALLY_RESOLVED', 'Partially Resolved'),
        ('RESOLVED', 'Resolved'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='backlogs')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='backlogs')
    date_incurred = models.DateField()
    missed_minutes = models.PositiveIntegerField()
    resolved_minutes = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='OUTSTANDING')
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def remaining_minutes(self):
        return max(0, self.missed_minutes - self.resolved_minutes)

    def __str__(self):
        return f"{self.subject.name}: {self.remaining_minutes}m backlog ({self.date_incurred})"


class StudyPlan(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('PARTIAL', 'Partial'),
        ('MISSED', 'Missed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_plans')
    date = models.DateField()
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='plans')
    allocated_minutes = models.PositiveIntegerField()
    backlog_minutes = models.PositiveIntegerField(default=0)
    allocation_reason = models.TextField(blank=True)
    is_confirmed = models.BooleanField(default=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'date', 'subject']
        ordering = ['date', 'subject']

    def __str__(self):
        return f"{self.date}: {self.subject.name} ({self.allocated_minutes}m)"


class FocusSession(models.Model):
    SESSION_STATES = [
        ('IDLE', 'Idle'),
        ('STUDYING', 'Studying'),
        ('BREAK', 'Break'),
        ('PAUSED', 'Paused'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    client_session_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='focus_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='focus_sessions')
    task = models.ForeignKey(StudyTask, on_delete=models.SET_NULL, null=True, blank=True)
    total_block_minutes = models.PositiveIntegerField()
    state = models.CharField(max_length=16, choices=SESSION_STATES, default='IDLE')
    current_segment_index = models.PositiveIntegerField(default=0)
    accumulated_study_seconds = models.PositiveIntegerField(default=0)
    accumulated_break_seconds = models.PositiveIntegerField(default=0)
    current_segment_started_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_state_change = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Session {self.client_session_id} - {self.subject.name} ({self.state})"


class StudySegment(models.Model):
    SEGMENT_TYPES = [
        ('STUDY', 'Study'),
        ('BREAK', 'Break'),
    ]

    session = models.ForeignKey(FocusSession, on_delete=models.CASCADE, related_name='segments')
    segment_index = models.PositiveIntegerField()
    segment_type = models.CharField(max_length=8, choices=SEGMENT_TYPES)
    duration_seconds = models.PositiveIntegerField()
    completed_seconds = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ['session', 'segment_index']
        unique_together = ['session', 'segment_index']

    def __str__(self):
        return f"{self.session.id} Seg {self.segment_index}: {self.segment_type} ({self.duration_seconds // 60}m)"


class SessionEvent(models.Model):
    session = models.ForeignKey(FocusSession, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=32)
    timestamp = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.session.id} - {self.event_type} at {self.timestamp}"


class StudyResource(models.Model):
    CATEGORY_CHOICES = [
        ('AI_TOOL', 'AI Study Tool'),
        ('COMMUNICATION', 'Communication & Study Group'),
        ('STUDY_MATERIAL', 'Study Material (Document/Image)'),
        ('LEARNING_RESOURCE', 'Learning Website / Docs'),
        ('CUSTOM', 'Custom Resource'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_resources')
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    url = models.URLField(max_length=500, blank=True)
    is_approved = models.BooleanField(default=False)
    is_enabled_for_focus = models.BooleanField(default=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='resources')
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.name} [{self.category}] - Approved: {self.is_approved}"


class StudyMaterial(models.Model):
    MATERIAL_TYPES = [
        ('IMAGE', 'Image / Photo / Screenshot'),
        ('PDF', 'PDF Document'),
        ('NOTE', 'Text Note'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_materials')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='materials')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='study_materials/%Y/%m/', null=True, blank=True)
    file_type = models.CharField(max_length=16, choices=MATERIAL_TYPES)
    file_size_bytes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.file_type})"


class StudyNote(models.Model):
    REVISION_CHOICES = [
        ('NEEDS_REVISION', 'Needs Revision'),
        ('IN_REVIEW', 'In Review'),
        ('MASTERED', 'Mastered'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_notes')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    questions_solved_count = models.PositiveIntegerField(default=0)
    checklist_items = models.JSONField(default=list, blank=True)
    revision_status = models.CharField(max_length=20, choices=REVISION_CHOICES, default='NEEDS_REVISION')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.revision_status})"


class SyncOperation(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sync_operations')
    operation_id = models.UUIDField(default=uuid.uuid4, unique=True)
    entity_type = models.CharField(max_length=50)
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    payload = models.JSONField(default=dict)
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['applied_at']

    def __str__(self):
        return f"{self.action} {self.entity_type} ({self.operation_id})"
