# C&T's Digital Photobooth

A tiny, mobile-first wedding camera app. Guests open it in their phone browser, take one photo, add the wedding frame, and save the finished image. Photos never leave the device.

## Publish a test on GitHub Pages

GitHub Pages gives the app the secure HTTPS address required for phone-camera access. This project includes an automatic publishing workflow.

### 1. Put the project on GitHub

1. Unzip the project folder.
2. Create a new empty repository at [github.com/new](https://github.com/new). Any repository name is fine.
3. Do not add a README, `.gitignore`, or licence on GitHub—the project already includes what it needs.
4. Open Terminal on your Mac and enter the commands below. Replace the folder path, your username, and repository name with your own values.

```bash
cd "/path/to/your/unzipped/cocktail-cam-project"
git init
git add .
git commit -m "Add C&T's Digital Photobooth"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

If GitHub asks you to sign in, follow the browser prompt.

### 2. Turn on GitHub Pages

1. Open your new repository on GitHub.
2. Choose **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the repository’s **Actions** tab. The “Deploy to GitHub Pages” job should begin automatically; if it does not, open it and choose **Run workflow**.
5. When the job shows a green checkmark, open the published link shown in the deployment.

### 3. Test it on your phone

1. Open the GitHub Pages link in Safari on your iPhone or Chrome on Android.
2. Tap **Open Camera** and allow camera access.
3. Take a photo, change its frame, and save it.
4. Confirm the saved image contains both the photo and the selected frame.

Keep the repository public while using a free GitHub account. GitHub Pages availability for private repositories depends on the account plan.

## Run it locally

1. Install Node.js 22 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dev`.
4. Open the local address shown in the terminal.

Camera access requires HTTPS on a deployed site. Browsers make an exception for `localhost`, so the camera also works during local development.

## Replace the wedding frame

Replace these three files with your own transparent PNG frames using the same filenames:

- `public/wedding-frame-1.png`
- `public/wedding-frame-2.png`
- `public/wedding-frame-3.png`

For best results, make the image:

- 1080 × 1350 pixels (a 4:5 portrait shape)
- transparent through the center
- decorative only around the edges, so faces stay visible

The Change Frame button cycles through all three options. It works in the live camera and after taking a photo, so guests can compare frames without retaking.

## Main files

- `app/page.tsx` contains the camera, countdown, capture, retake, and save flow.
- `app/globals.css` contains all styling.
- `public/wedding-frame-1.png`, `public/wedding-frame-2.png`, and `public/wedding-frame-3.png` are the replaceable frames.

There is no login, database, upload, photo storage, or server-side image processing.
