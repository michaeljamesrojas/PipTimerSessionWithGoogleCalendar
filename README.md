# PiP Timer with Google Calendar Integration

A Picture-in-Picture timer application that allows you to track time and save your sessions directly to Google Calendar. Built with vanilla JavaScript, this application provides a floating timer window that can track your sessions and automatically save them to your Google Calendar.

## Features

- Picture-in-Picture timer display
- Google Calendar integration for session logging
- Clean, minimalist UI
- No dependencies - pure JavaScript

## Prerequisites

- A modern web browser that supports Picture-in-Picture mode
- A Google Cloud Project with Calendar API enabled
- A local development server (e.g., Live Server VS Code extension)

## Setup

1. Set up Google Cloud Project:

   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the Google Calendar API:
     - Go to "APIs & Services" > "Library"
     - Search for "Google Calendar API"
     - Click "Enable"
   - Create credentials:
     - Go to "APIs & Services" > "Credentials"
     - Click "Create Credentials" > "API key"
     - Copy the API key
     - Click "Create Credentials" > "OAuth client ID"
     - Choose "Web application"
     - Add authorized JavaScript origins:
       - `http://localhost` (or your local development URL)
       - `http://127.0.0.1`
       - Your production domain (if any)
   - Set up the OAuth consent screen:
     - Go to "APIs & Services" > "OAuth consent screen"
     - Choose "External"
     - Fill in the required information
     - Add your Google account email as a test user

2. Configure environment:

   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update `.env` with your Google credentials:
     ```
     GOOGLE_API_KEY=your_api_key_here
     GOOGLE_CLIENT_ID=your_client_id_here
     ```

3. Start a local development server:
   - Using VS Code Live Server extension:
     - Install Live Server extension
     - Right-click on `index.html`
     - Select "Open with Live Server"
   - Or use any other static file server

## Development Setup

1. Run the setup script to create your local environment:

   - Windows: `setup.bat`
   - Unix/Linux/Mac: `./setup.sh`

2. Start a local development server:
   - Using VS Code Live Server extension:
     - Install Live Server extension
     - Right-click on `index.html`
     - Select "Open with Live Server"
   - Or use any other static file server

## Deployment

To deploy to GitHub Pages:

1. Fork or clone this repository
2. Set up GitHub repository secrets:
   - Go to repository Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `GOOGLE_API_KEY`: Your Google API key
     - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
3. Enable GitHub Pages:
   - Go to repository Settings > Pages
   - Select the `gh-pages` branch as the source
4. Update Google Cloud Console:
   - Add your GitHub Pages URL (e.g., `https://yourusername.github.io/your-repo`) to the authorized JavaScript origins

The GitHub Action will automatically deploy your site when you push to the main branch.

## Usage

1. Open the application in your browser
2. Click "Start Timer" to begin a new session
   - A Picture-in-Picture window will appear with the timer
3. The timer will show the elapsed time of your session
4. When you want to save the session:
   - Click "Save to Calendar"
   - Authorize the application (first time only)
   - The session will be saved to your Google Calendar with duration details

## Project Structure

```
├── src/
│   ├── domain/
│   │   ├── pip/
│   │   │   └── PipService.js      # PiP timer functionality
│   │   └── calendar/
│   │       └── GoogleCalendarService.js  # Calendar integration
│   └── config.js                  # Configuration management
├── index.html                     # Main application page
├── .env                          # Environment variables (not committed)
├── .env.example                  # Environment template
└── .gitignore                    # Git ignore rules
```

## Security Notes

- Never commit the `.env` file to version control
- Keep your API keys and Client ID secure
- For production:
  - Set up environment variables in your hosting platform
  - Restrict API key usage in Google Cloud Console
  - Add your production domain to authorized origins

## Troubleshooting

1. "App not verified" error:

   - Make sure your email is added as a test user in the OAuth consent screen

2. Authentication fails:

   - Check if your origins are properly configured in Google Cloud Console
   - Verify your API key and Client ID in `.env`
   - Make sure you're running the app through a web server (not opening the file directly)

3. Black screen in PiP window:

   - Make sure your browser supports Picture-in-Picture mode
   - Check browser console for any errors

4. Calendar event not creating:
   - Ensure you've enabled Google Calendar API
   - Check if you've granted the necessary calendar permissions
   - Verify your Google account is added as a test user

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)

For more issues, please check the [issues page](issues-link) or create a new one.
