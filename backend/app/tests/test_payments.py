import json
from decimal import Decimal
from unittest.mock import patch, MagicMock
from app.tests.base import AsyncDatabaseTestCase
from app.models.user import User, UserRole, UserStatus
from app.models.booking import Booking, BookingStatus, ServiceCategory
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.api.routes.payments import CreateOrderRequest, VerifyPaymentRequest
from fastapi import HTTPException
from app.api.routes.payments import create_order, verify_payment

class TestPaymentsAPI(AsyncDatabaseTestCase):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        
        # Seed test category
        self.category = ServiceCategory(
            name="Crane Lift",
            slug="crane-lift",
            base_hourly_rate=Decimal("2000.00"),
            overtime_hourly_rate=Decimal("2500.00"),
            emergency_fee=Decimal("1500.00"),
            reservation_fee=Decimal("500.00"),
            is_active=True,
        )
        self.db.add(self.category)
        
        # Seed customer
        self.customer = User(
            name="Test Customer",
            email="customer@test.com",
            phone="9000000001",
            password_hash="hash",
            role=UserRole.CUSTOMER,
            status=UserStatus.ACTIVE,
        )
        self.db.add(self.customer)
        await self.db.commit()
        await self.db.refresh(self.category)
        await self.db.refresh(self.customer)

        # Seed booking
        self.booking = Booking(
            booking_number="CON-TEST-123",
            customer_id=self.customer.id,
            service_category_id=self.category.id,
            status=BookingStatus.PAYMENT_PENDING,
            reservation_fee=Decimal("500.00"),
            emergency_fee=Decimal("0.00"),
            is_emergency=False,
            pickup_latitude=10.0,
            pickup_longitude=76.0,
            pickup_address="Test Address",
            duration_hours=2.0,
            estimated_price=Decimal("500.00"),
        )
        self.db.add(self.booking)
        await self.db.commit()
        await self.db.refresh(self.booking)

    @patch("razorpay.Client")
    async def test_create_order_success(self, mock_razorpay_client):
        # Configure settings to have credentials
        from app.core.config import settings
        settings.RAZORPAY_KEY_ID = "rzp_test_T6IK1Tx4JTFNRV"
        settings.RAZORPAY_KEY_SECRET = "Y6GEIEEAgY0bPx2JG9enHKS1"

        # Mock razorpay order creation response
        mock_client_instance = MagicMock()
        mock_client_instance.order.create.return_value = {
            "id": "order_test_12345",
            "amount": 50000,
            "currency": "INR",
            "receipt": "rcpt_CON-TEST-123"
        }
        mock_razorpay_client.return_value = mock_client_instance

        # Call create_order
        req = CreateOrderRequest(booking_id=self.booking.id, payment_type="reservation")
        response = await create_order(request=req, user=self.customer, db=self.db)

        self.assertTrue(response.success)
        self.assertEqual(response.data["order_id"], "order_test_12345")
        self.assertEqual(response.data["customer_name"], "Test Customer")
        self.assertEqual(response.data["customer_email"], "customer@test.com")
        self.assertEqual(response.data["customer_phone"], "9000000001")

        # Verify payment was stored in database
        from sqlalchemy import select
        result = await self.db.execute(
            select(Payment).where(Payment.booking_id == self.booking.id)
        )
        payment = result.scalar_one_or_none()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.razorpay_order_id, "order_test_12345")
        self.assertEqual(payment.amount, 500.0)

    @patch("razorpay.Client")
    async def test_create_order_failure(self, mock_razorpay_client):
        from app.core.config import settings
        settings.RAZORPAY_KEY_ID = "rzp_test_T6IK1Tx4JTFNRV"
        settings.RAZORPAY_KEY_SECRET = "Y6GEIEEAgY0bPx2JG9enHKS1"

        # Mock client to raise exception
        mock_client_instance = MagicMock()
        mock_client_instance.order.create.side_effect = Exception("Razorpay API Error")
        mock_razorpay_client.return_value = mock_client_instance

        req = CreateOrderRequest(booking_id=self.booking.id, payment_type="reservation")
        with self.assertRaises(HTTPException) as context:
            await create_order(request=req, user=self.customer, db=self.db)
        
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Failed to create Razorpay order", context.exception.detail)

    @patch("razorpay.Client")
    async def test_verify_payment_success(self, mock_razorpay_client):
        from app.core.config import settings
        settings.RAZORPAY_KEY_ID = "rzp_test_T6IK1Tx4JTFNRV"
        settings.RAZORPAY_KEY_SECRET = "Y6GEIEEAgY0bPx2JG9enHKS1"

        # Create a payment record in db
        payment = Payment(
            booking_id=self.booking.id,
            customer_id=self.customer.id,
            razorpay_order_id="order_test_12345",
            payment_type=PaymentType.RESERVATION,
            amount=500.0,
            status=PaymentStatus.CREATED,
            receipt="rcpt_CON-TEST-123"
        )
        self.db.add(payment)
        await self.db.commit()

        # Mock verify signature success (does not raise exception)
        mock_client_instance = MagicMock()
        mock_razorpay_client.return_value = mock_client_instance

        req = VerifyPaymentRequest(
            razorpay_order_id="order_test_12345",
            razorpay_payment_id="pay_test_12345",
            razorpay_signature="sig_test_12345"
        )
        
        with patch("app.services.matching_service.MatchingService.match_and_assign") as mock_match:
            response = await verify_payment(request=req, user=self.customer, db=self.db)
            self.assertTrue(response.success)
            self.assertEqual(response.data["payment_status"], "paid")
            mock_match.assert_called_once()

        # Verify payment status in database is updated
        await self.db.refresh(payment)
        self.assertEqual(payment.status, PaymentStatus.PAID)
        self.assertEqual(payment.razorpay_payment_id, "pay_test_12345")
        self.assertEqual(payment.razorpay_signature, "sig_test_12345")
