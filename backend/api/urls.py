from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    ProfileView,
    SubjectViewSet,
    TimetableEntryViewSet,
    ScheduleExceptionViewSet,
    UnavailableTimeBlockViewSet,
    AvailableTimeView,
    StudyTaskViewSet,
    BacklogViewSet,
    StudyPlanViewSet,
    FocusSessionViewSet,
    StudyResourceViewSet,
    StudyMaterialViewSet,
    StudyNoteViewSet,
    AnalyticsView,
    SyncViewSet,
)

class OptionalSlashRouter(DefaultRouter):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trailing_slash = '/?'

router = OptionalSlashRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'timetable', TimetableEntryViewSet, basename='timetable')
router.register(r'exceptions', ScheduleExceptionViewSet, basename='exception')
router.register(r'unavailable-blocks', UnavailableTimeBlockViewSet, basename='unavailable-block')
router.register(r'tasks', StudyTaskViewSet, basename='task')
router.register(r'backlogs', BacklogViewSet, basename='backlog')
router.register(r'plans', StudyPlanViewSet, basename='plan')
router.register(r'sessions', FocusSessionViewSet, basename='session')
router.register(r'resources', StudyResourceViewSet, basename='resource')
router.register(r'materials', StudyMaterialViewSet, basename='material')
router.register(r'notes', StudyNoteViewSet, basename='note')
router.register(r'sync', SyncViewSet, basename='sync')

urlpatterns = [
    # Auth endpoints (supporting both with and without trailing slash)
    re_path(r'^auth/register/?$', RegisterView.as_view(), name='register'),
    re_path(r'^auth/login/?$', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    re_path(r'^auth/token/refresh/?$', TokenRefreshView.as_view(), name='token_refresh'),
    re_path(r'^auth/profile/?$', ProfileView.as_view(), name='profile'),

    # Dedicated calculation and reporting endpoints
    re_path(r'^available-time/?$', AvailableTimeView.as_view(), name='available-time'),
    re_path(r'^analytics/?$', AnalyticsView.as_view(), name='analytics'),

    # ViewSets
    path('', include(router.urls)),
]
