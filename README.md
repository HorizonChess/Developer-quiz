# Dev Interview Quiz

A mobile-first quiz app for practicing the technical questions junior developers get in job interviews. It is a **PWA** (Progressive Web App): a website you can install on your phone's home screen and use like a normal app, even offline.

> Status: **step 1 of 4, the app skeleton.** The screens and quiz flow work, with a handful of placeholder questions. The full question bank, saved progress, and publishing come next.

## Screens

| Screen | Address | What it does |
| --- | --- | --- |
| Home | `#/` | Start a mixed quiz or choose a topic |
| Topics | `#/topics` | List of topics with question counts |
| Quiz | `#/quiz/<topic>` | One question at a time, instant feedback and explanation |
| Results | `#/results` | Score, plus the questions you missed with their answers |

## Run it on your computer

You need [Node.js](https://nodejs.org) (version 20 or newer). Node runs JavaScript outside the browser and comes with **npm**, the tool that downloads the libraries this project uses.

```bash
npm install      # download the libraries (only needed once)
npm run dev      # start a local server, then open the address it prints
```

To try it on your phone, run `npm run dev -- --host` and open the "Network" address on a phone connected to the same Wi-Fi.

Other commands:

```bash
npm run build    # create the final optimized files in the dist/ folder
npm run preview  # serve the built files locally, to check them before publishing
npm run lint     # check the code for common mistakes
```

## How the code is organized

```
src/
  main.jsx            starts the app and sets up page navigation
  App.jsx             maps each address (#/topics, #/quiz/...) to a screen
  index.css           all styling; colors are variables at the top, with a dark mode
  components/
    Layout.jsx        the top bar (back button + logo) shown on every screen
  pages/
    Home.jsx  Topics.jsx  Quiz.jsx  Results.jsx
  data/
    topics.js         the list of topics
    questions.js      the questions (placeholders for now)
  lib/
    quiz.js           picks and shuffles questions and answer options
public/               icons used for the installed app
vite.config.js        build settings, including the PWA setup
```

### Adding a question

Add an object to `src/data/questions.js`:

```js
{
  id: 'js-3',                 // unique
  topic: 'javascript',        // must match an id in topics.js
  type: 'multiple-choice',    // or 'code-output'
  prompt: 'Question text',
  code: 'optional code snippet',
  options: ['A', 'B', 'C', 'D'],
  answer: 0,                  // position of the correct option, starting at 0
  explanation: 'Why the answer is correct.',
}
```

## Tech choices

- **React**: a library for building the screens out of reusable pieces called components.
- **Vite**: the tool that runs the local server and bundles the code for publishing. It is fast and needs almost no setup.
- **React Router (HashRouter)**: switches screens based on the address. The "hash" style (`/#/topics`) works on any free static host without extra server settings.
- **vite-plugin-pwa**: generates the app manifest (name, icons, colors) and a service worker, a small background script that caches the app so it opens offline.
- No login and no server. Progress will be saved on the device. The quiz logic is kept separate from the screens so accounts can be added later without a rewrite.

## Roadmap

1. ~~App skeleton: screens, navigation, PWA setup~~
2. Large question bank across all topics, with templates that vary names and values
3. Saved progress, score history and weak-topic tracking (on the device)
4. Visual polish, phone testing, and free hosting
