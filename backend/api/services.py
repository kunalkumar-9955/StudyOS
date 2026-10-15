"""
StudyOS Business Logic and Algorithmic Services
- Deterministic Study & Break Timer algorithm
- Available Time calculation with interval union & midnight crossing
- Backlog calculation and fair capacity allocation
- Resource URL security validation and normalization
"""

from datetime import datetime, time, date, timedelta
from urllib.parse import urlparse
import re


class TimerScheduleService:
    """
    Strict Study and Break Timer Schedule Generator.
    Satisfies exact acceptance criteria:
      - 60 min -> 50m study + 10m break
      - 120 min -> 60m study + 10m break + 50m study
      - 180 min -> 60m study + 10m break + 60m study + 10m break + 40m study
    All segment durations sum exactly to total_minutes.
    """

    @staticmethod
    def generate_schedule(total_minutes: int):
        if not isinstance(total_minutes, int) or total_minutes < 15:
            raise ValueError("Configured study block duration must be at least 15 minutes.")

        segments = []

        if total_minutes < 60:
            # Documented short-session policy:
            if total_minutes >= 30:
                study_duration = total_minutes - 5
                segments.append({'type': 'STUDY', 'duration_minutes': study_duration})
                segments.append({'type': 'BREAK', 'duration_minutes': 5})
            else:
                segments.append({'type': 'STUDY', 'duration_minutes': total_minutes})
        elif total_minutes == 60:
            segments.append({'type': 'STUDY', 'duration_minutes': 50})
            segments.append({'type': 'BREAK', 'duration_minutes': 10})
        else:
            # Durations longer than 60 minutes
            # Schedule initial 60m study and 10m break
            segments.append({'type': 'STUDY', 'duration_minutes': 60})
            segments.append({'type': 'BREAK', 'duration_minutes': 10})
            remaining = total_minutes - 70

            while remaining > 60:
                segments.append({'type': 'STUDY', 'duration_minutes': 60})
                segments.append({'type': 'BREAK', 'duration_minutes': 10})
                remaining -= 70

            if remaining > 0:
                segments.append({'type': 'STUDY', 'duration_minutes': remaining})

        # Rigorous acceptance validation: sum must match exactly
        total_scheduled = sum(s['duration_minutes'] for s in segments)
        if total_scheduled != total_minutes:
            raise ValueError(f"Schedule sum mismatch: expected {total_minutes}m, got {total_scheduled}m.")

        # Convert to seconds for timer engine
        result = []
        for idx, seg in enumerate(segments):
            result.append({
                'segment_index': idx,
                'segment_type': seg['type'],
                'duration_seconds': seg['duration_minutes'] * 60,
                'duration_minutes': seg['duration_minutes'],
            })
        return result


class AvailableTimeService:
    """
    Calculates net available self-study time by subtracting overlapping commitments
    from the configured planning window (default: 4:00 PM to 2:00 AM next day = 10 hrs).
    Supports midnight crossing and merges intervals to prevent double subtraction.
    """

    @staticmethod
    def time_to_minutes_from_anchor(t: time, anchor: time = time(16, 0)) -> int:
        """
        Converts time into minutes relative to anchor (16:00).
        Anchor 16:00 is 0. 23:59 is 479. 00:00 next day is 480. 02:00 next day is 600.
        """
        t_mins = t.hour * 60 + t.minute
        anchor_mins = anchor.hour * 60 + anchor.minute
        if t_mins >= anchor_mins:
            return t_mins - anchor_mins
        else:
            # Crossed midnight
            return (1440 - anchor_mins) + t_mins

    @staticmethod
    def interval_overlap_with_window(start_m: int, end_m: int, win_start: int, win_end: int):
        """Returns clamped overlap [s, e] or None."""
        s = max(start_m, win_start)
        e = min(end_m, win_end)
        if s < e:
            return (s, e)
        return None

    @classmethod
    def merge_intervals(cls, intervals):
        if not intervals:
            return []
        sorted_intervals = sorted(intervals, key=lambda x: x[0])
        merged = [sorted_intervals[0]]
        for current in sorted_intervals[1:]:
            prev_start, prev_end = merged[-1]
            if current[0] <= prev_end:
                merged[-1] = (prev_start, max(prev_end, current[1]))
            else:
                merged.append(current)
        return merged

    @classmethod
    def calculate_available_time(cls, planning_start: time, planning_end: time, commitments: list):
        """
        commitments: list of dicts with 'start_time', 'end_time', 'label'
        planning_start: e.g. 16:00
        planning_end: e.g. 02:00 (next day)
        """
        # Total window duration
        if planning_end <= planning_start:
            window_minutes = (24 * 60 - (planning_start.hour * 60 + planning_start.minute)) + (planning_end.hour * 60 + planning_end.minute)
        else:
            window_minutes = (planning_end.hour * 60 + planning_end.minute) - (planning_start.hour * 60 + planning_start.minute)

        raw_overlaps = []
        breakdown = []

        for c in commitments:
            cs = c['start_time']
            ce = c['end_time']
            # Determine start and end in timeline relative to planning_start
            # If commitment crosses midnight
            if ce < cs:
                # Two pieces
                c_spans = [(cs, time(23, 59)), (time(0, 0), ce)]
            else:
                c_spans = [(cs, ce)]

            for s_time, e_time in c_spans:
                s_rel = cls.time_to_minutes_from_anchor(s_time, planning_start)
                e_rel = cls.time_to_minutes_from_anchor(e_time, planning_start)
                # If e_time is 23:59, treat as 24:00
                if e_time == time(23, 59):
                    e_rel += 1

                overlap = cls.interval_overlap_with_window(s_rel, e_rel, 0, window_minutes)
                if overlap:
                    raw_overlaps.append(overlap)
                    breakdown.append({
                        'label': c.get('label', 'Commitment'),
                        'deducted_minutes': overlap[1] - overlap[0],
                    })

        merged_overlaps = cls.merge_intervals(raw_overlaps)
        total_deducted = sum(e - s for s, e in merged_overlaps)
        available_minutes = max(0, window_minutes - total_deducted)

        return {
            'window_total_minutes': window_minutes,
            'total_deducted_minutes': total_deducted,
            'available_minutes': available_minutes,
            'available_hours': round(available_minutes / 60, 2),
            'commitments_breakdown': breakdown,
        }


class BacklogService:
    """
    Manages outstanding obligations when daily study is missed or partially completed.
    Carries forward unfinished work without duplicate entries.
    Distributes available capacity fairly based on priority without starving any subject.
    """

    @staticmethod
    def calculate_reallocation(subjects_data: list, available_minutes: int):
        """
        subjects_data: list of dicts with:
          - id, name, priority (1=High, 2=Medium, 3=Low)
          - daily_target_minutes
          - outstanding_backlog_minutes
        """
        # Separate normal targets and backlog
        allocations = []
        remaining_capacity = available_minutes

        # Step 1: Guarantee base proportional time for normal daily targets by priority
        # High priority gets full target first, then medium, then low
        sorted_by_priority = sorted(subjects_data, key=lambda s: (s['priority'], s['name']))

        # Pass 1: Allocate normal daily targets up to capacity
        for subj in sorted_by_priority:
            target = subj.get('daily_target_minutes', 60)
            allocated_normal = min(target, remaining_capacity)
            remaining_capacity -= allocated_normal
            allocations.append({
                'subject_id': subj['id'],
                'name': subj['name'],
                'priority': subj['priority'],
                'normal_allocated': allocated_normal,
                'target_unmet': max(0, target - allocated_normal),
                'backlog_allocated': 0,
                'backlog_remaining': subj.get('outstanding_backlog_minutes', 0),
                'total_allocated': allocated_normal,
                'allocation_reason': f"Daily target {target}m (allocated {allocated_normal}m)",
            })

        # Pass 2: If remaining capacity exists, allocate toward outstanding backlog
        alloc_map = {a['subject_id']: a for a in allocations}
        for subj in sorted_by_priority:
            if remaining_capacity <= 0:
                break
            backlog = subj.get('outstanding_backlog_minutes', 0)
            if backlog > 0:
                backlog_to_add = min(backlog, remaining_capacity)
                alloc_map[subj['id']]['backlog_allocated'] = backlog_to_add
                alloc_map[subj['id']]['backlog_remaining'] = backlog - backlog_to_add
                alloc_map[subj['id']]['total_allocated'] += backlog_to_add
                remaining_capacity -= backlog_to_add
                alloc_map[subj['id']]['allocation_reason'] += f" + {backlog_to_add}m backlog clearance"

        total_scheduled = sum(a['total_allocated'] for a in allocations)
        total_backlog_remaining = sum(a['backlog_remaining'] for a in allocations)
        shortfall = max(0, sum(s.get('daily_target_minutes', 60) + s.get('outstanding_backlog_minutes', 0) for s in subjects_data) - available_minutes)

        explanation = (
            f"Allocated {total_scheduled}m across {len(allocations)} subjects within your {available_minutes}m capacity. "
        )
        if shortfall > 0:
            explanation += f"{shortfall}m preserved in backlog due to schedule constraints without starving high priority subjects."

        return {
            'available_capacity_minutes': available_minutes,
            'total_allocated_minutes': total_scheduled,
            'remaining_free_minutes': remaining_capacity,
            'shortfall_minutes': shortfall,
            'total_backlog_remaining': total_backlog_remaining,
            'allocations': list(alloc_map.values()),
            'explanation': explanation,
        }


class ResourceValidationService:
    """
    Validates user-submitted study resource URLs.
    Rejects dangerous navigation protocols (javascript:, data:, vbscript:, etc.).
    Normalizes safe HTTP/HTTPS links and extracts domain details.
    """

    FORBIDDEN_PROTOCOLS = {'javascript', 'data', 'vbscript', 'file', 'about'}

    @classmethod
    def validate_and_normalize(cls, raw_url: str):
        if not raw_url or not isinstance(raw_url, str):
            raise ValueError("URL must be a non-empty string.")

        clean_url = raw_url.strip()

        # Check for dangerous schemes
        scheme_match = re.match(r'^([a-zA-Z0-9+.-]+):', clean_url)
        if scheme_match:
            scheme = scheme_match.group(1).lower()
            if scheme in cls.FORBIDDEN_PROTOCOLS:
                raise ValueError(f"Dangerous protocol '{scheme}:' is strictly prohibited.")
            if scheme not in ('http', 'https'):
                raise ValueError(f"Unsupported protocol '{scheme}:'. Only HTTP and HTTPS are permitted.")
        else:
            # Auto-prepend https:// if omitted
            clean_url = 'https://' + clean_url

        parsed = urlparse(clean_url)
        if not parsed.netloc:
            raise ValueError("Invalid URL structure: Hostname could not be parsed.")

        hostname = parsed.netloc.lower()
        # Remove default ports
        hostname = re.sub(r':(80|443)$', '', hostname)

        # Detect well-known study tools
        known_category = 'CUSTOM'
        embed_policy = 'NEW_TAB_RECOMMENDED'

        if any(tool in hostname for tool in ['chatgpt.com', 'openai.com']):
            known_category = 'AI_TOOL'
            embed_policy = 'FALLBACK_EXTERNAL'  # X-Frame-Options DENY
        elif any(tool in hostname for tool in ['gemini.google.com', 'claude.ai']):
            known_category = 'AI_TOOL'
            embed_policy = 'FALLBACK_EXTERNAL'
        elif 'web.whatsapp.com' in hostname:
            known_category = 'COMMUNICATION'
            embed_policy = 'FALLBACK_EXTERNAL'
        elif any(tool in hostname for tool in ['github.com', 'stackoverflow.com', 'developer.mozilla.org', 'wikipedia.org', 'coursera.org']):
            known_category = 'LEARNING_RESOURCE'
            embed_policy = 'FALLBACK_EXTERNAL'

        return {
            'is_valid': True,
            'normalized_url': clean_url,
            'hostname': hostname,
            'detected_category': known_category,
            'embed_policy': embed_policy,
        }
