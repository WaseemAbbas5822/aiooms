import os
import sys

# Lets the tests import main.py, models.py, analytics.py from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
