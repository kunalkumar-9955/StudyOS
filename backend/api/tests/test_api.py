import uuid
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Subject, FocusSession, StudyResource, StudyNote


class AuthAndUserIsolationTestCase(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username='usera', password='password123', email='a@example.com')
        self.user_b = User.objects.create_user(username='userb', password='password123', email='b@example.com')

    def test_user_registration(self):
        resp = self.client.post('/api/auth/register/', {
            'username': 'newuser',
            'password': 'password123',
            'email': 'new@example.com'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_user_jwt_login(self):
        resp = self.client.post('/api/auth/login/', {
            'username': 'usera',
            'password': 'password123'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_user_data_isolation(self):
        # Create a subject for User A
        subj_a = Subject.objects.create(user=self.user_a, name='DSA User A', color='#10b981', daily_target_minutes=60)

        # Authenticate as User B
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.get('/api/subjects/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 0)

        # Attempt to access User A's subject directly via User B
        resp_detail = self.client.get(f'/api/subjects/{subj_a.id}/')
        self.assertEqual(resp_detail.status_code, status.HTTP_404_NOT_FOUND)


class FocusSessionFlowTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='studyuser', password='password123')
        self.client.force_authenticate(user=self.user)
        self.subject = Subject.objects.create(user=self.user, name='Python Mastery', color='#6366f1', daily_target_minutes=60)

    def test_session_lifecycle_with_break_and_manual_resume(self):
        # 1. Start 60 min session
        resp = self.client.post('/api/sessions/start/', {
            'subject_id': self.subject.id,
            'total_block_minutes': 60
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        session_id = resp.data['id']
        self.assertEqual(resp.data['state'], 'STUDYING')
        self.assertEqual(len(resp.data['segments']), 2)
        self.assertEqual(resp.data['segments'][0]['segment_type'], 'STUDY')
        self.assertEqual(resp.data['segments'][1]['segment_type'], 'BREAK')

        # 2. Enter break
        resp = self.client.post(f'/api/sessions/{session_id}/enter_break/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['state'], 'BREAK')

        # 3. Complete break -> must transition to PAUSED (strict manual resume required)
        resp = self.client.post(f'/api/sessions/{session_id}/complete_break/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['state'], 'PAUSED')

        # 4. User returns and manually resumes
        resp = self.client.post(f'/api/sessions/{session_id}/resume/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['state'], 'STUDYING')

        # 5. Complete session
        resp = self.client.post(f'/api/sessions/{session_id}/complete/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['state'], 'COMPLETED')


class ResourceSecurityTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='resourceuser', password='password123')
        self.client.force_authenticate(user=self.user)

    def test_reject_javascript_protocol(self):
        resp = self.client.post('/api/resources/', {
            'name': 'Malicious Exploit',
            'category': 'CUSTOM',
            'url': 'javascript:alert(document.cookie)'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_resource_creation_and_approval_toggle(self):
        resp = self.client.post('/api/resources/', {
            'name': 'ChatGPT Assistant',
            'category': 'AI_TOOL',
            'url': 'https://chatgpt.com',
            'is_approved': False
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        res_id = resp.data['id']

        # Toggle approval
        resp_toggle = self.client.post(f'/api/resources/{res_id}/toggle_approval/')
        self.assertEqual(resp_toggle.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_toggle.data['is_approved'])
