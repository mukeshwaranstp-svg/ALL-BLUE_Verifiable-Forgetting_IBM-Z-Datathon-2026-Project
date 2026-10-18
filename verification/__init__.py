"""
Verification Package for Verifiable Forgetting.

Contains modules for verifying deletion across system targets.
Person 2 owns model_checks.py and exports verify_model_deletion.
"""

from .model_checks import verify_model_deletion

__all__ = ["verify_model_deletion"]
