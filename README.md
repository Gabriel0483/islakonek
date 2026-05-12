# Isla Konek - Maritime Booking System

This is a modern maritime booking system built with Next.js, React, Tailwind CSS, and Firebase.

## Project Configuration

### Changing the Git Repository
If you need to point this local project to a different Git repository (e.g., after moving to a new team or organization), run the following command in your terminal:

```bash
git remote set-url origin <new-repository-url>
```

To verify the change, use:
```bash
git remote -v
```

### Handling Git Pull Conflicts (Divergent Branches)
If you see an error about "divergent branches" when pulling code, run this command to allow merging:

```bash
git config pull.rebase false  # This sets merge as the default strategy
git pull origin main
```

### Changing the Firebase Backend
To connect this application to a different Firebase project (data repository):
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project and go to **Project Settings**.
3. Under **Your apps**, copy the `firebaseConfig` object.
4. Replace the content of the `firebaseConfig` object in `src/firebase/config.ts`.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS & Shadcn UI
- **Database/Auth**: Firebase (Firestore & Auth)
- **AI**: Genkit 1.x
