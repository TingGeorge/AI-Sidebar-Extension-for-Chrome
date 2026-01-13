# AI Sidebar Extension

An intelligent Chrome extension that brings the power of Mistral AI directly to your browser sidebar. Chat with AI, summarize webpages, explain complex text, and analyze images without leaving your current tab.

![Extension Icon](icon128.png)

## 🚀 Features

-   **🤖 Advanced AI Chat**: Chat with Mistral's powerful language models (Pixtral, Mistral Large, Medium, Small).
-   **👁️ Vision Capabilities**: Drag and drop or upload up to 3 images for the AI to analyze and describe (powered by Pixtral).
-   **📄 Page Summarization**: Instantly get concise summaries of any webpage you are visiting.
-   **🔍 Contextual Explanations**: Select any text on a webpage and ask the AI to explain it in simple terms.
-   **🌐 Smart Translation**: Translate selected text between English and other languages with context.
-   **💾 Local History**: Your conversation history is saved locally in your browser so you don't lose context.
-   **🎨 Markdown Support**: Responses feature full Markdown support including code syntax highlighting, tables, and formatting.

## 🛠️ Installation

1.  **Clone or Download** this repository to your local machine.
2.  Open **Google Chrome** and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder where you downloaded this project (the directory containing `manifest.json`).
6.  The **AI Sidebar** extension should now appear in your extensions list.

## 🔑 Setup

To use this extension, you need a Mistral AI API Key.

1.  Click the extension icon in your browser toolbar to open the sidebar (or use the Side Panel button).
2.  Click the **Settings** (gear) icon in the top right of the sidebar.
3.  Enter your **Mistral API Key**. (You can get one from [console.mistral.ai](https://console.mistral.ai/)).
4.  Select your preferred model (default is `pixtral-large-latest` for image capabilities).
5.  Click **Save Settings**.

## 📖 Usage

### General Chat
Simply type your query in the input box at the bottom and hit Enter or click the Send button.

### analyzing Images
-   Click the **Upload** button or **Drag & Drop** images directly into the sidebar.
-   You can upload up to 3 images at once.
-   Ask questions about the images or let the AI describe them.

### Quick Actions
Top of the sidebar features quick action chips:
-   **Summarize**: Reads the current page content and provides a summary.
-   **Explain**: Explains currently selected text (select text on page -> click Explain).
-   **Translate**: Translates currently selected text.

### Context Menu
You can also right-click on any text on a webpage to access AI features directly from the context menu.

## 🔒 Privacy

-   **Local Storage**: Your API key and chat history are stored locally in your browser via `chrome.storage.local`.
-   **Direct Communication**: The extension communicates directly with Mistral AI's API. No intermediate servers are used.

## 📄 License

[MIT](LICENSE)
