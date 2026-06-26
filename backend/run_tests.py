import sys
import os

# Insert the backend root directory to the python search path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import unittest

if __name__ == '__main__':
    print("Starting Constructo Backend Test Suite...")
    suite = unittest.defaultTestLoader.discover('app/tests')
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
