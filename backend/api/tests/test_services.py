from django.test import TestCase
from datetime import time, date
from api.services import (
    TimerScheduleService,
    AvailableTimeService,
    BacklogService,
    ResourceValidationService
)


class TimerScheduleServiceTestCase(TestCase):
    def test_exact_60_minute_block(self):
        """
        One-hour block:
        50 minutes study, 10 minutes break. Total: 60 minutes.
        """
        schedule = TimerScheduleService.generate_schedule(60)
        self.assertEqual(len(schedule), 2)
        self.assertEqual(schedule[0]['segment_type'], 'STUDY')
        self.assertEqual(schedule[0]['duration_minutes'], 50)
        self.assertEqual(schedule[0]['duration_seconds'], 3000)

        self.assertEqual(schedule[1]['segment_type'], 'BREAK')
        self.assertEqual(schedule[1]['duration_minutes'], 10)
        self.assertEqual(schedule[1]['duration_seconds'], 600)

        total_mins = sum(s['duration_minutes'] for s in schedule)
        self.assertEqual(total_mins, 60)

    def test_exact_120_minute_block(self):
        """
        Two-hour block:
        60 minutes study, 10 minutes break, 50 minutes study. Total: 120 minutes.
        """
        schedule = TimerScheduleService.generate_schedule(120)
        self.assertEqual(len(schedule), 3)
        self.assertEqual(schedule[0]['segment_type'], 'STUDY')
        self.assertEqual(schedule[0]['duration_minutes'], 60)
        self.assertEqual(schedule[1]['segment_type'], 'BREAK')
        self.assertEqual(schedule[1]['duration_minutes'], 10)
        self.assertEqual(schedule[2]['segment_type'], 'STUDY')
        self.assertEqual(schedule[2]['duration_minutes'], 50)

        total_mins = sum(s['duration_minutes'] for s in schedule)
        self.assertEqual(total_mins, 120)

    def test_exact_180_minute_block(self):
        """
        Three-hour block:
        60 minutes study, 10 minutes break, 60 minutes study, 10 minutes break, 40 minutes study. Total: 180 minutes.
        """
        schedule = TimerScheduleService.generate_schedule(180)
        self.assertEqual(len(schedule), 5)
        self.assertEqual(schedule[0]['segment_type'], 'STUDY')
        self.assertEqual(schedule[0]['duration_minutes'], 60)
        self.assertEqual(schedule[1]['segment_type'], 'BREAK')
        self.assertEqual(schedule[1]['duration_minutes'], 10)
        self.assertEqual(schedule[2]['segment_type'], 'STUDY')
        self.assertEqual(schedule[2]['duration_minutes'], 60)
        self.assertEqual(schedule[3]['segment_type'], 'BREAK')
        self.assertEqual(schedule[3]['duration_minutes'], 10)
        self.assertEqual(schedule[4]['segment_type'], 'STUDY')
        self.assertEqual(schedule[4]['duration_minutes'], 40)

        total_mins = sum(s['duration_minutes'] for s in schedule)
        self.assertEqual(total_mins, 180)

    def test_arbitrary_and_boundary_durations(self):
        """Test 30, 45, 90, 150, and 240-minute blocks as specified in prompt."""
        test_durations = [30, 45, 90, 150, 240]
        for dur in test_durations:
            schedule = TimerScheduleService.generate_schedule(dur)
            total_calc = sum(s['duration_minutes'] for s in schedule)
            self.assertEqual(total_calc, dur, f"Mismatch for duration {dur}")
            for s in schedule:
                self.assertIn(s['segment_type'], ['STUDY', 'BREAK'])
                self.assertGreater(s['duration_minutes'], 0)


class AvailableTimeServiceTestCase(TestCase):
    def test_default_10_hour_window_with_no_commitments(self):
        # 16:00 to 02:00 = 600 minutes (10 hours)
        result = AvailableTimeService.calculate_available_time(time(16, 0), time(2, 0), [])
        self.assertEqual(result['window_total_minutes'], 600)
        self.assertEqual(result['total_deducted_minutes'], 0)
        self.assertEqual(result['available_minutes'], 600)

    def test_midnight_crossing_and_overlapping_commitments(self):
        # Window: 16:00 to 02:00
        # Commitment 1: Dinner 20:00 to 21:00 (60 mins)
        # Commitment 2: Overlapping Walking 20:30 to 21:30 (overlaps with dinner by 30 mins)
        # Combined union: 20:00 to 21:30 = 90 mins (NO double subtraction!)
        commitments = [
            {'start_time': time(20, 0), 'end_time': time(21, 0), 'label': 'Dinner'},
            {'start_time': time(20, 30), 'end_time': time(21, 30), 'label': 'Walk'},
        ]
        result = AvailableTimeService.calculate_available_time(time(16, 0), time(2, 0), commitments)
        self.assertEqual(result['total_deducted_minutes'], 90)
        self.assertEqual(result['available_minutes'], 510)


class BacklogServiceTestCase(TestCase):
    def test_partial_daily_target_and_backlog_calculation(self):
        """
        If user completes only 40m of a 120m Python target,
        save remaining 80m as unfinished work.
        """
        daily_target = 120
        completed = 40
        unfinished = max(0, daily_target - completed)
        self.assertEqual(unfinished, 80)

        # Subject with 80m unfinished + 30m previous backlog = 110m total demand
        subjects = [
            {'id': 1, 'name': 'Python', 'priority': 1, 'daily_target_minutes': 80, 'outstanding_backlog_minutes': 30},
        ]
        # When capacity is 60m (insufficient)
        result = BacklogService.calculate_reallocation(subjects, 60)
        self.assertEqual(result['total_allocated_minutes'], 60)
        # Remaining 20m regular target + 30m backlog = 50m shortfall preserved
        self.assertEqual(result['shortfall_minutes'], 50)
        self.assertIn("preserved in backlog", result['explanation'])

    def test_capacity_fair_allocation(self):
        subjects = [
            {'id': 1, 'name': 'Python', 'priority': 1, 'daily_target_minutes': 120, 'outstanding_backlog_minutes': 30},
            {'id': 2, 'name': 'DSA', 'priority': 1, 'daily_target_minutes': 60, 'outstanding_backlog_minutes': 0},
            {'id': 3, 'name': 'Java', 'priority': 2, 'daily_target_minutes': 45, 'outstanding_backlog_minutes': 60},
        ]
        # Total need = 120+30 + 60 + 45+60 = 315m
        # Available capacity = 200m
        result = BacklogService.calculate_reallocation(subjects, 200)
        self.assertEqual(result['available_capacity_minutes'], 200)
        self.assertEqual(result['total_allocated_minutes'], 200)
        self.assertEqual(result['shortfall_minutes'], 115)
        # Verify allocations sum to 200
        total_alloc = sum(a['total_allocated'] for a in result['allocations'])
        self.assertEqual(total_alloc, 200)


class ResourceValidationServiceTestCase(TestCase):
    def test_safe_urls(self):
        res = ResourceValidationService.validate_and_normalize('https://chatgpt.com')
        self.assertTrue(res['is_valid'])
        self.assertEqual(res['detected_category'], 'AI_TOOL')
        self.assertEqual(res['hostname'], 'chatgpt.com')

    def test_dangerous_protocol_rejection(self):
        with self.assertRaises(ValueError):
            ResourceValidationService.validate_and_normalize('javascript:alert(1)')

        with self.assertRaises(ValueError):
            ResourceValidationService.validate_and_normalize('data:text/html,<script>alert(1)</script>')
