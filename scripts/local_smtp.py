#!/usr/bin/env python3
"""
Local SMTP server that captures emails and saves them as .eml files.
Emails are stored in /home/user/tuttoinsieme/emails/
Run: python3 scripts/local_smtp.py
"""
import asyncio
import os
import time
from datetime import datetime
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Message

EMAIL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'emails')

class EmailHandler:
    async def handle_RCPT(self, server, session, envelope, address, rcpt_options):
        envelope.rcpt_tos.append(address)
        return '250 OK'

    async def handle_DATA(self, server, session, envelope):
        os.makedirs(EMAIL_DIR, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        rcpt = envelope.rcpt_tos[0].replace('@', '_at_') if envelope.rcpt_tos else 'unknown'
        filename = f"{timestamp}_{rcpt}.eml"
        filepath = os.path.join(EMAIL_DIR, filename)

        with open(filepath, 'wb') as f:
            f.write(envelope.content)

        print(f"[{datetime.now().isoformat()}] Email captured:")
        print(f"  From: {envelope.mail_from}")
        print(f"  To: {', '.join(envelope.rcpt_tos)}")
        print(f"  Saved: {filepath}")
        print(f"  Size: {len(envelope.content)} bytes")
        print()

        return '250 Message accepted for delivery'


def main():
    handler = EmailHandler()
    controller = Controller(handler, hostname='127.0.0.1', port=1025)
    controller.start()
    print(f"Local SMTP server running on 127.0.0.1:1025")
    print(f"Emails will be saved to: {EMAIL_DIR}")
    print("Press Ctrl+C to stop\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        controller.stop()
        print("\nSMTP server stopped.")


if __name__ == '__main__':
    main()
