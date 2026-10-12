# World Meningitis Day quiz

The quiz is a static page for GitHub Pages. `index.html` is the entry page; `Quiz.html` redirects to it. The design is in `style.css`, the questions are in `questions.js`, and the quiz behavior is in `quiz.js`.

## Publish on GitHub Pages

1. Put `index.html`, `Quiz.html`, `style.css`, `questions.js`, `quiz.js`, `config.js`, `.nojekyll`, and the `assets` folder at the top level of the repository. The other files are setup and tests.
2. In the repository, open **Settings → Pages**. Set **Source** to **Deploy from a branch**, choose your publishing branch (for example, `main`), and select **/(root)**.
3. Open the GitHub Pages URL shown in Settings. `index.html` loads automatically. The relative file paths also work for a project site at `https://USERNAME.github.io/REPOSITORY/`.
4. Keep the deployed Apps Script `/exec` URL in `config.js`. This URL is public website configuration, so it is visible to visitors. Do not put a Google account credential or Sheet data in that file.

## Connect your Google Sheet

1. Open the Google Sheet that should hold the quiz results. Choose **Extensions → Apps Script**.
2. Replace the default script with the contents of `Code.gs` and save it. Select `setupQuizSheet` in the Apps Script editor, click **Run**, and authorize it. This records the Sheet ID for web requests and creates the **World Meningitis Day Quiz Logs** tab.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as** to **Me** and allow access to the people who will take the quiz. For a public quiz, choose **Anyone**. Authorize the deployment and copy its URL ending in `/exec`.
4. Paste that URL between the quotes in `config.js`.
5. Publish the quiz files on GitHub Pages. After changing `Code.gs`, open **Deploy → Manage deployments**, edit the existing web app, select **New version**, and deploy. This keeps the `/exec` URL in `config.js` working.
6. Open that `/exec` URL in a browser. It should say **World Meningitis Day quiz results sheet is ready.** If it shows a setup code, use the troubleshooting steps below.

The script creates a **World Meningitis Day Quiz Logs** tab with these columns: Name, Email, Consent, Q1 Points through Q10 Points, and Total. It checks email addresses before the quiz starts and again when a result is saved. Results are stored only in that Google Sheet. No response file or browser storage is used.

## If Start quiz shows a sheet error

- **SETUP_REQUIRED:** Open the results Sheet, choose **Extensions → Apps Script**, run `setupQuizSheet` once, and authorize it. Then reload the quiz. This is required even when the script is attached to the Sheet, because a web app cannot use the active Sheet automatically.
- **HEADERS_MISMATCH:** Open the **World Meningitis Day Quiz Logs** tab. Row 1 must contain the headings listed above, in that exact order. Correct the headings without changing saved response rows.
- **SHEET_ACCESS_ERROR:** Run `setupQuizSheet` again from the correct results Sheet and confirm that the Google account chosen under **Execute as Me** can open it.
- **SERVER_ERROR:** In Apps Script, open **Executions** to see the logged error. Check that the deployed web app has the latest `Code.gs` version.

The one-time rule checks the email entered by the participant. It does not verify ownership of that email address.

## Check the code

Run `node test-quiz.js` for the Apps Script logic and page structure checks. This uses an in-memory Sheet mock and does not send data or create a local results file.
