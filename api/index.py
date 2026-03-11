import sys 
from pathlib import Path

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from api.main import app
