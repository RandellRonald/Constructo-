import subprocess
import json
import os
from datetime import datetime

def run_command(cmd, cwd):
    print(f"Running: {cmd} in {cwd}")
    try:
        result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, errors='replace')
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def generate_report():
    print("=== Constructo Full Testing Suite ===")
    
    # 1. Backend Pytest
    print("\nRunning Backend Pytest (Unit, API, Integration, WS, Security, DB, BDD)...")
    backend_success, b_out, b_err = run_command(".\\venv\\Scripts\\activate.ps1; pytest", cwd="backend")
    
    # 2. Frontend Vitest
    print("\nRunning Frontend Vitest...")
    frontend_success, f_out, f_err = run_command("npx vitest run", cwd="frontend")
    
    # 3. Playwright (assuming we want to just check if it's set up in this skeleton)
    # print("\nRunning Playwright E2E...")
    # pw_success, p_out, p_err = run_command("npx playwright test", cwd="frontend")
    
    # Generate HTML Report
    html_content = f"""
    <html>
    <head>
        <title>Constructo QA Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f9; }}
            h1 {{ color: #333; }}
            .pass {{ color: green; font-weight: bold; }}
            .fail {{ color: red; font-weight: bold; }}
            .section {{ background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            pre {{ background: #eee; padding: 10px; overflow-x: auto; }}
        </style>
    </head>
    <body>
        <h1>Constructo Automated QA Report</h1>
        <p>Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        
        <div class="section">
            <h2>Backend Pytest Suite (1-10 Layers)</h2>
            <p>Status: <span class="{'pass' if backend_success else 'fail'}">{'PASS' if backend_success else 'FAIL'}</span></p>
            <pre>{b_out[-1000:] if b_out else "No output"}</pre>
        </div>
        
        <div class="section">
            <h2>Frontend Vitest Suite</h2>
            <p>Status: <span class="{'pass' if frontend_success else 'fail'}">{'PASS' if frontend_success else 'FAIL'}</span></p>
            <pre>{f_out[-1000:] if f_out else "No output"}</pre>
        </div>
        
        <p><em>*Note: Playwright and Locust skipped in quick reporting script skeleton.</em></p>
    </body>
    </html>
    """
    
    with open("final_report.html", "w") as f:
        f.write(html_content)
        
    print("\nReport generated: final_report.html")

if __name__ == "__main__":
    generate_report()
