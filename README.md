# World Meningitis Day quiz

The quiz is a static page for GitHub Pages. `index.html` is the entry page. The design is in `style.css`, the questions are in `questions.js`, and the quiz behavior is in `quiz.js`.

## Publish on GitHub Pages

1. Put `index.html`, `style.css`, `questions.js`, `quiz.js`, `config.js`, `.nojekyll`, and the `assets` folder at the top level of the repository. The other files are setup and tests.
2. In the repository, open **Settings → Pages**. Set **Source** to **Deploy from a branch**, choose your publishing branch (for example, `main`), and select **/(root)**.
3. Open the GitHub Pages URL shown in Settings. `index.html` loads automatically. The relative file paths also work for a project site at `https://USERNAME.github.io/REPOSITORY/`.
4. Keep the deployed Apps Script `/exec` URL in `config.js`. This URL is public website configuration, so it is visible to visitors. Do not put a Google account credential or Sheet data in that file.

## Connect your Google Sheet

1. The target Google Sheet is identified by `QUIZ_SHEET_ID` at the top of `Code.gs`. The current value is the Sheet supplied for this quiz. If the results should go to a different Sheet, replace that ID first.
2. Open the Apps Script project that owns the `/exec` URL in `config.js`. Replace its code with the contents of `Code.gs` and save it. The current deployment reports `SETUP_REQUIRED`; saving the local file alone will not change the live deployment.
3. Choose **Deploy → Manage deployments**, edit the web app used in `config.js`, select **New version**, and deploy. Set **Execute as** to **Me** and access to **Anyone** for a public quiz. Authorize access to the Sheet if prompted. Keep the existing `/exec` URL so `config.js` does not need to change. If you cannot find that deployment, open the target Sheet, choose **Extensions → Apps Script**, paste `Code.gs`, then choose **Deploy → New deployment → Web app** with the same settings. Put its new `/exec` URL in `config.js` and republish the page.
4. Open the active `/exec` URL in a browser. It must say **World Meningitis Day quiz results sheet is ready.** Then take a complete test quiz with a new test email and confirm that a row appears in the **World Meningitis Day Quiz Logs** tab. A duplicate email cannot take the quiz again.
5. Publish the quiz files on GitHub Pages if any page files change. Updating only `Code.gs` in the existing deployment requires the Apps Script deployment above, not a Pages republish.

The script creates a **World Meningitis Day Quiz Logs** tab with these columns: Name, Email, Consent, Q1 Points through Q10 Points, and Total. It checks email addresses before the quiz starts and again when a result is saved. Results are stored only in that Google Sheet. No response file or browser storage is used.

## If Start quiz shows a sheet error

- **SETUP_REQUIRED:** The live deployment is still running an older version of `Code.gs` or has no Sheet ID. Save the current `Code.gs` in the deployed Apps Script project and deploy a **New version** as described above.
- **HEADERS_MISMATCH:** Open the **World Meningitis Day Quiz Logs** tab. Row 1 must contain the headings listed above, in that exact order. Correct the headings without changing saved response rows.
- **SHEET_ACCESS_ERROR:** Confirm that `QUIZ_SHEET_ID` is correct and the Google account chosen under **Execute as Me** can edit that Sheet.
- **SERVER_ERROR:** In Apps Script, open **Executions** to see the logged error. Check that the deployed web app has the latest `Code.gs` version.

The one-time rule checks the email entered by the participant. It does not verify ownership of that email address.

## Check the code

Run `node test-quiz.js` for the Apps Script logic and page structure checks. This uses an in-memory Sheet mock and does not send data or create a local results file.
