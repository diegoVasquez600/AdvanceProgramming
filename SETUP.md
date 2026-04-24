# Setup Guide - Colombia EVA EDA Project

## Installation Instructions

### 1. Create and Activate Virtual Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install --upgrade pip setuptools wheel

pip install -r requirements.txt
```

---

## Troubleshooting: Windows DLL Security Policy Error

If you get an error like:
```
ImportError: DLL load failed while importing parsing: An Application Control policy has blocked this file.
```

This is a Windows security issue. Try these solutions:

### Solution 1: Reinstall pandas with Updated Pip (Recommended)

```bash
# Upgrade pip, setuptools, and wheel
python -m pip install --upgrade pip setuptools wheel

# Uninstall and reinstall pandas
pip uninstall pandas -y
pip install --no-cache-dir pandas==2.0.3
```

### Solution 2: Disable Windows Defender Temporarily

1. Open **Windows Security** (search in Start menu)
2. Click **Virus & threat protection**
3. Click **Manage settings**
4. Toggle **Real-time protection** to OFF
5. Run the installation again
6. Re-enable real-time protection

### Solution 3: Use PyArrow Backend (Alternative)

```bash
# Install with pyarrow backend
pip install --upgrade pip
pip uninstall pandas -y
pip install pandas==2.0.3 pyarrow
```

Then in your notebook, add this at the top:

```python
import pandas as pd
pd.set_option('mode.copy_on_write', True)
```

### Solution 4: Clear pip Cache and Reinstall All

```bash
# Remove virtual environment
rmdir .venv /s /q

# Create new virtual environment
python -m venv .venv

# Activate
.venv\Scripts\activate

# Clear pip cache and install fresh
pip install --no-cache-dir -r requirements.txt
```

### Solution 5: Add Files to Windows Defender Exclusion (Admin Required)

If you have admin access:

1. Open **Windows Security**
2. Go to **Virus & threat protection** → **Manage settings**
3. Scroll to **Exclusions** section
4. Click **Add or remove exclusions**
5. Add your project folder: `C:\Users\diego\source\repos\AdvanceProgramming`

---

## Verify Installation

Once installed, verify everything works:

```bash
# Check Python version
python --version

# Test imports
python -c "import pandas, numpy, matplotlib, sodapy; print('✓ All imports successful!')"

# Start Jupyter
jupyter notebook
```

---

## Running the Notebook

1. Activate the virtual environment (if not already active)
2. Start Jupyter:
   ```bash
   jupyter notebook
   ```
3. Open `2 - Exploratory_Data_Analysis_Colombia_EVA.ipynb`
4. Configure the dataset (it's already set to EVA dataset ID: 2pnw-mmge)
5. Run cells sequentially

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'pandas'` | Run: `pip install -r requirements.txt` |
| `pip: command not found` | Use: `python -m pip install -r requirements.txt` |
| `Permission denied` | Use: `pip install --user -r requirements.txt` |
| Jupyter won't start | Try: `pip install --upgrade jupyter jupyterlab` |
| Plots not showing | Ensure `matplotlib` is installed in the active venv |

---

## Environment Variables (Recommended)

Use environment variables for API credentials (do not hardcode secrets in notebooks or files committed to git).

### PowerShell (Windows) - current session

```powershell
$env:DATOSABIERTOS_API_KEY = "YOUR_API_KEY_ID"
$env:DATOSABIERTOS_API_SECRET = "YOUR_API_KEY_SECRET"
# Optional: explicit app token (if omitted, notebook uses DATOSABIERTOS_API_KEY)
$env:DATOSABIERTOS_APP_TOKEN = "YOUR_APP_TOKEN"
```

### Permanent in user environment (Windows)

```powershell
[System.Environment]::SetEnvironmentVariable("DATOSABIERTOS_API_KEY", "YOUR_API_KEY_ID", "User")
[System.Environment]::SetEnvironmentVariable("DATOSABIERTOS_API_SECRET", "YOUR_API_KEY_SECRET", "User")
[System.Environment]::SetEnvironmentVariable("DATOSABIERTOS_APP_TOKEN", "YOUR_APP_TOKEN", "User")
```

Reopen terminal/Jupyter after setting permanent variables.

---

## Need Help?

- Check Python version is 3.8+ : `python --version`
- Verify pip is updated: `pip --version`
- Check virtual environment is activated (you should see `(.venv)` in your terminal)
- Windows antivirus may interfere with binary packages
