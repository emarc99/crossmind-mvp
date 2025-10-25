import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv('OPENAI_API_KEY')
print(f'OPENAI_API_KEY={key}')
print(f'Check1 - key is not None: {bool(key)}')
if key:
    print(f'Check2 - key != placeholder: {key != "sk-your-new-api-key-here"}')
    print(f'Check3 - startswith sk-: {key.startswith("sk-")}')
    print(f'Check4 - len > 20: {len(key)} > 20 = {len(key) > 20}')
    print(f'Check5 - "your" not in lower: {"your" not in key.lower()}')
    print(f'Combined (for HybridIntentParser): {key and key.startswith("sk-") and len(key) > 20 and "your" not in key.lower()}')
    print(f'Combined (for main.py): {key != "sk-your-new-api-key-here"}')
