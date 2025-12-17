import pyotp
import qrcode
from io import BytesIO
import base64
import hashlib

class OTPManager:
    """Manager for Google Authenticator OTP generation and verification"""
    
    # Server secret for deterministic generation (keep this secret!)
    SERVER_SECRET = "OpusApp-Secret-Key-2025"  # Change this to your own secret
    
    @staticmethod
    def generate_secret():
        """Generate a new random secret key for TOTP"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_deterministic_secret(email):
        """Generate deterministic secret from email (same email = same secret)"""
        # Hash email with server secret to create deterministic but secure secret
        combined = f"{email.lower()}:{OTPManager.SERVER_SECRET}"
        hash_bytes = hashlib.sha256(combined.encode()).digest()
        # Convert to base32 for TOTP compatibility
        secret = base64.b32encode(hash_bytes).decode('utf-8')[:32]  # 32 chars for TOTP
        return secret
    
    @staticmethod
    def get_totp_token(secret):
        """Get current TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.now()
    
    @staticmethod
    def verify_totp_token(secret, token):
        """Verify TOTP token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)  # Allow 1 step before/after
    
    @staticmethod
    def get_provisioning_uri(secret, email, issuer_name="OpusApp"):
        """Get provisioning URI for QR code"""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer_name)
    
    @staticmethod
    def generate_qr_code(provisioning_uri):
        """Generate QR code as base64 image"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
