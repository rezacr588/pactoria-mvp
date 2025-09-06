"""
Unit tests for Core DateTime Utils Module
Testing datetime utility functions
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
import time

from app.core.datetime_utils import get_current_utc, ensure_utc, utc_from_timestamp


class TestGetCurrentUTC:
    """Test get_current_utc function"""

    def test_get_current_utc_returns_datetime(self):
        """Test that get_current_utc returns a datetime object"""
        result = get_current_utc()

        assert isinstance(result, datetime)

    def test_get_current_utc_is_utc_timezone(self):
        """Test that get_current_utc returns UTC timezone"""
        result = get_current_utc()

        assert result.tzinfo == timezone.utc

    def test_get_current_utc_is_current_time(self):
        """Test that get_current_utc returns current time"""
        before = datetime.now(timezone.utc)
        result = get_current_utc()
        after = datetime.now(timezone.utc)

        # Result should be between before and after (allowing for small execution time)
        assert before <= result <= after

    def test_get_current_utc_multiple_calls_increase(self):
        """Test that multiple calls return increasing timestamps"""
        first_call = get_current_utc()

        # Small delay to ensure time difference
        time.sleep(0.001)

        second_call = get_current_utc()

        assert second_call > first_call

    def test_get_current_utc_precision(self):
        """Test that get_current_utc has microsecond precision"""
        result = get_current_utc()

        # Should have microsecond precision (not None)
        assert result.microsecond is not None
        assert isinstance(result.microsecond, int)
        assert 0 <= result.microsecond < 1000000


class TestEnsureUTC:
    """Test ensure_utc function"""

    def test_ensure_utc_with_naive_datetime(self):
        """Test ensure_utc with naive datetime"""
        naive_dt = datetime(2023, 1, 15, 14, 30, 45, 123456)

        result = ensure_utc(naive_dt)

        assert result.tzinfo == timezone.utc
        assert result.year == 2023
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 14
        assert result.minute == 30
        assert result.second == 45
        assert result.microsecond == 123456

    def test_ensure_utc_with_utc_datetime(self):
        """Test ensure_utc with already UTC datetime"""
        utc_dt = datetime(2023, 1, 15, 14, 30, 45, 123456, timezone.utc)

        result = ensure_utc(utc_dt)

        assert result.tzinfo == timezone.utc
        assert result == utc_dt  # Should be identical

    def test_ensure_utc_with_different_timezone(self):
        """Test ensure_utc with different timezone datetime"""
        # Create datetime in EST (UTC-5)
        est_tz = timezone(timedelta(hours=-5))
        est_dt = datetime(2023, 1, 15, 9, 30, 45, 123456, est_tz)

        result = ensure_utc(est_dt)

        assert result.tzinfo == timezone.utc
        # 9 AM EST = 2 PM UTC
        assert result.hour == 14
        assert result.day == 15  # Same day

    def test_ensure_utc_with_positive_timezone(self):
        """Test ensure_utc with positive timezone offset"""
        # Create datetime in JST (UTC+9)
        jst_tz = timezone(timedelta(hours=9))
        jst_dt = datetime(2023, 1, 15, 23, 30, 45, 123456, jst_tz)

        result = ensure_utc(jst_dt)

        assert result.tzinfo == timezone.utc
        # 11:30 PM JST = 2:30 PM UTC
        assert result.hour == 14
        assert result.day == 15  # Same day

    def test_ensure_utc_with_fractional_timezone(self):
        """Test ensure_utc with fractional timezone offset"""
        # India Standard Time (UTC+5:30)
        ist_tz = timezone(timedelta(hours=5, minutes=30))
        ist_dt = datetime(2023, 1, 15, 20, 0, 0, 0, ist_tz)

        result = ensure_utc(ist_dt)

        assert result.tzinfo == timezone.utc
        # 8:00 PM IST = 2:30 PM UTC
        assert result.hour == 14
        assert result.minute == 30

    def test_ensure_utc_date_boundary_crossing(self):
        """Test ensure_utc when conversion crosses date boundary"""
        # Test forward date crossing
        tz_plus = timezone(timedelta(hours=10))
        dt_plus = datetime(2023, 1, 15, 2, 0, 0, 0, tz_plus)
        result_plus = ensure_utc(dt_plus)

        assert result_plus.tzinfo == timezone.utc
        assert result_plus.day == 14  # Previous day in UTC
        assert result_plus.hour == 16  # 2 AM + 10 hours = 12 PM previous day UTC

        # Test backward date crossing
        tz_minus = timezone(timedelta(hours=-10))
        dt_minus = datetime(2023, 1, 15, 22, 0, 0, 0, tz_minus)
        result_minus = ensure_utc(dt_minus)

        assert result_minus.tzinfo == timezone.utc
        assert result_minus.day == 16  # Next day in UTC
        assert result_minus.hour == 8  # 10 PM - 10 hours = 8 AM next day UTC


class TestUTCFromTimestamp:
    """Test utc_from_timestamp function"""

    def test_utc_from_timestamp_basic(self):
        """Test basic timestamp conversion"""
        timestamp = 1673798400.0  # 2023-01-15 12:00:00 UTC

        result = utc_from_timestamp(timestamp)

        assert isinstance(result, datetime)
        assert result.tzinfo == timezone.utc
        assert result.year == 2023
        assert result.month == 1
        assert result.day == 15

    def test_utc_from_timestamp_with_microseconds(self):
        """Test timestamp conversion with microseconds"""
        timestamp = 1673798400.123456  # With microseconds

        result = utc_from_timestamp(timestamp)

        assert result.tzinfo == timezone.utc
        assert result.microsecond == 123456

    def test_utc_from_timestamp_zero(self):
        """Test timestamp zero (Unix epoch)"""
        timestamp = 0.0

        result = utc_from_timestamp(timestamp)

        assert result.tzinfo == timezone.utc
        assert result.year == 1970
        assert result.month == 1
        assert result.day == 1
        assert result.hour == 0
        assert result.minute == 0
        assert result.second == 0

    def test_utc_from_timestamp_negative(self):
        """Test negative timestamp (before Unix epoch)"""
        timestamp = -86400.0  # One day before epoch

        result = utc_from_timestamp(timestamp)

        assert result.tzinfo == timezone.utc
        assert result.year == 1969
        assert result.month == 12
        assert result.day == 31

    def test_utc_from_timestamp_future(self):
        """Test future timestamp"""
        timestamp = 4102444800.0  # 2100-01-01 00:00:00 UTC

        result = utc_from_timestamp(timestamp)

        assert result.tzinfo == timezone.utc
        assert result.year == 2100
        assert result.month == 1
        assert result.day == 1

    def test_utc_from_timestamp_current_time(self):
        """Test timestamp from current time"""
        current_time = time.time()

        result = utc_from_timestamp(current_time)

        assert result.tzinfo == timezone.utc

        # Should be close to current UTC time
        current_utc = get_current_utc()
        time_diff = abs((result - current_utc).total_seconds())
        assert time_diff < 1.0  # Within 1 second


class TestDateTimeUtilsIntegration:
    """Test integration between datetime utility functions"""

    def test_get_current_utc_and_ensure_utc_integration(self):
        """Test integration between get_current_utc and ensure_utc"""
        current_utc = get_current_utc()
        ensured_utc = ensure_utc(current_utc)

        # Should be identical since it's already UTC
        assert current_utc == ensured_utc
        assert current_utc.tzinfo == ensured_utc.tzinfo

    def test_timestamp_roundtrip(self):
        """Test roundtrip conversion: datetime -> timestamp -> datetime"""
        original_dt = get_current_utc()
        timestamp = original_dt.timestamp()
        recovered_dt = utc_from_timestamp(timestamp)

        # Should match within microsecond precision
        time_diff = abs((original_dt - recovered_dt).total_seconds())
        assert time_diff < 0.000001

    def test_ensure_utc_with_current_time_in_different_timezones(self):
        """Test ensure_utc with current time in different timezones"""
        # Get current UTC time
        utc_now = get_current_utc()

        # Convert to different timezones and back
        est_tz = timezone(timedelta(hours=-5))
        est_time = utc_now.astimezone(est_tz)

        # Ensure UTC should bring it back to UTC
        converted_back = ensure_utc(est_time)

        # Should match the original UTC time
        assert abs((utc_now - converted_back).total_seconds()) < 0.000001


class TestErrorHandling:
    """Test error handling in datetime utilities"""

    def test_ensure_utc_with_none(self):
        """Test ensure_utc with None input"""
        with pytest.raises(AttributeError):
            ensure_utc(None)

    def test_ensure_utc_with_invalid_type(self):
        """Test ensure_utc with invalid input type"""
        with pytest.raises(AttributeError):
            ensure_utc("not_a_datetime")

        with pytest.raises(AttributeError):
            ensure_utc(12345)

    def test_utc_from_timestamp_with_invalid_type(self):
        """Test utc_from_timestamp with invalid input type"""
        with pytest.raises((TypeError, ValueError)):
            utc_from_timestamp("not_a_number")

        with pytest.raises((TypeError, ValueError)):
            utc_from_timestamp(None)


class TestEdgeCases:
    """Test edge cases for datetime utilities"""

    def test_leap_year_handling(self):
        """Test leap year date handling"""
        # Leap year date
        leap_timestamp = datetime(
            2024, 2, 29, 12, 0, 0, tzinfo=timezone.utc
        ).timestamp()
        result = utc_from_timestamp(leap_timestamp)

        assert result.year == 2024
        assert result.month == 2
        assert result.day == 29

    def test_daylight_saving_transition(self):
        """Test handling of daylight saving time transitions"""
        # Create a timezone-aware datetime during DST transition
        # This tests the robustness of our UTC conversion

        # EST to EDT transition (spring forward)
        est_tz = timezone(timedelta(hours=-5))
        spring_dt = datetime(2023, 3, 12, 7, 0, 0, 0, est_tz)

        result = ensure_utc(spring_dt)
        assert result.tzinfo == timezone.utc
        assert result.hour == 12  # 7 AM EST = 12 PM UTC

    def test_extreme_timestamps(self):
        """Test extreme timestamp values"""
        # Very large timestamp (far future)
        large_timestamp = 2**31 - 1  # Max 32-bit timestamp
        result_large = utc_from_timestamp(float(large_timestamp))
        assert result_large.tzinfo == timezone.utc

        # Very small timestamp (far past)
        small_timestamp = -(2**31)  # Min 32-bit timestamp
        result_small = utc_from_timestamp(float(small_timestamp))
        assert result_small.tzinfo == timezone.utc

    def test_microsecond_precision_preservation(self):
        """Test microsecond precision is preserved"""
        # Create datetime with specific microseconds
        original_dt = datetime(2023, 1, 15, 12, 30, 45, 123456, timezone.utc)

        # Convert to timestamp and back
        timestamp = original_dt.timestamp()
        recovered_dt = utc_from_timestamp(timestamp)

        # Microseconds should be preserved
        assert recovered_dt.microsecond == original_dt.microsecond

    def test_timezone_boundary_cases(self):
        """Test timezone boundary cases"""
        # Maximum positive offset (UTC+14)
        max_tz = timezone(timedelta(hours=14))
        max_dt = datetime(2023, 1, 15, 14, 0, 0, 0, max_tz)
        result_max = ensure_utc(max_dt)

        assert result_max.tzinfo == timezone.utc
        assert result_max.hour == 0  # 2 PM +14 = 12 AM UTC

        # Maximum negative offset (UTC-12)
        min_tz = timezone(timedelta(hours=-12))
        min_dt = datetime(2023, 1, 15, 14, 0, 0, 0, min_tz)
        result_min = ensure_utc(min_dt)

        assert result_min.tzinfo == timezone.utc
        assert result_min.hour == 2  # 2 PM -12 = 2 AM next day UTC
        assert result_min.day == 16


class TestPerformance:
    """Test performance characteristics of datetime utilities"""

    def test_get_current_utc_performance(self):
        """Test performance of get_current_utc"""
        start_time = time.perf_counter()

        # Call function many times
        for _ in range(1000):
            get_current_utc()

        end_time = time.perf_counter()
        total_time = end_time - start_time

        # Should complete 1000 calls in reasonable time (< 1 second)
        assert total_time < 1.0

    def test_ensure_utc_performance(self):
        """Test performance of ensure_utc"""
        dt = datetime(2023, 1, 15, 14, 30, 45, 123456)

        start_time = time.perf_counter()

        # Call function many times
        for _ in range(1000):
            ensure_utc(dt)

        end_time = time.perf_counter()
        total_time = end_time - start_time

        # Should complete 1000 calls in reasonable time (< 1 second)
        assert total_time < 1.0

    def test_utc_from_timestamp_performance(self):
        """Test performance of utc_from_timestamp"""
        timestamp = 1673798400.0

        start_time = time.perf_counter()

        # Call function many times
        for _ in range(1000):
            utc_from_timestamp(timestamp)

        end_time = time.perf_counter()
        total_time = end_time - start_time

        # Should complete 1000 calls in reasonable time (< 1 second)
        assert total_time < 1.0
