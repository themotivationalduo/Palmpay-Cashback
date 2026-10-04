# 📱 How to Download & Build this App as an Android APK Using GitHub

This project comes pre-configured with **Automated GitHub Actions** and **Capacitor Android** support to automatically build a downloadable `.apk` file directly on GitHub with zero local Android Studio setup needed.

---

## 🚀 Option 1: Automatic Download via GitHub Actions (Recommended)

Whenever you push code or manually run the build workflow on GitHub:

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "feat: setup APK build"
   git push origin main
   ```

2. **Open your Repository on GitHub in your browser**:
   - Click on the **"Actions"** tab at the top of your GitHub repository.
   - You will see the workflow named **"Build Android APK"**.
   - (Optional) If you want to trigger it manually without pushing, click **"Build Android APK"** on the left menu, then click **"Run workflow"** -> **"Run workflow"**.

3. **Download your APK**:
   - Click on the completed workflow run (marked with a green checkmark ✅).
   - Scroll down to the **Artifacts** section at the bottom of the page.
   - Click **`PalmPay-CashBack-Android-APK`** to download your ready-to-install `.apk` file directly!
   - Transfer or open the `.apk` on your Android device and tap **Install**.

---

## 💻 Option 2: Build Locally (If you have Android Studio)

If you have Android Studio installed locally on your machine:

1. Build web production assets:
   ```bash
   npm run build
   ```

2. Initialize and sync Android platform:
   ```bash
   npx cap add android
   npx cap sync android
   ```

3. Open Android Studio:
   ```bash
   npx cap open android
   ```

4. In Android Studio, go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.

---

## ⚙️ Configuration Details
- **App ID**: `com.palmpay.cashback`
- **App Name**: `PalmPay CashBack`
- **Output Artifact**: `PalmPay-CashBack-v1.0.0.apk`
- **Workflow File**: `.github/workflows/build-apk.yml`
- **Capacitor Config**: `capacitor.config.json`
