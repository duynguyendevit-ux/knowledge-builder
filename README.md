# Knowledge Builder

AI-powered knowledge management system that automatically transforms raw data into structured wiki using LLM.

## 🎯 Overview

Knowledge Builder uses LLM to automatically:
- Process raw documents (papers, articles, repos, images)
- Generate structured markdown wiki
- Create connections and backlinks
- Maintain knowledge graph
- Provide insights and health checks

## 🏗️ Architecture

```
raw/                    → Raw data (papers, repos, images, docs)
  ↓ (LLM processing)
wiki/                   → Structured markdown
  ├── summaries/        → Document summaries
  ├── concepts/         → Concept pages
  ├── connections/      → Backlinks and relationships
  └── insights/         → Analysis and synthesis
  ↓ (Obsidian)
Visualization          → Graph view, slides, charts
```

## 🚀 Features

- **Auto-summarization**: Automatically summarize documents
- **Concept extraction**: Extract and organize key concepts
- **Connection discovery**: Find relationships between documents
- **Health check**: Find inconsistencies and suggest improvements
- **Obsidian integration**: Compatible with Obsidian vault structure

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/duynguyendevit-ux/knowledge-builder.git
cd knowledge-builder

# Install dependencies
npm install
```

## 🔧 Usage

### 1. Add raw data

Drop your files into the `raw/` directory:
```bash
raw/
  ├── papers/
  ├── articles/
  ├── repos/
  └── images/
```

### 2. Process data

```bash
# Process all raw data
npm run process

# Process specific directory
npm run process -- --dir raw/papers
```

### 3. View in Obsidian

Open the `wiki/` directory as an Obsidian vault.

## 🛠️ Configuration

Edit `config.json`:

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "your-api-key"
  },
  "paths": {
    "raw": "./raw",
    "wiki": "./wiki"
  },
  "processing": {
    "autoSummarize": true,
    "extractConcepts": true,
    "findConnections": true
  }
}
```

## 📚 Wiki Structure

Generated wiki follows this structure:

```
wiki/
  ├── index.md                    # Main index
  ├── summaries/
  │   ├── paper-1.md
  │   └── article-1.md
  ├── concepts/
  │   ├── machine-learning.md
  │   └── neural-networks.md
  ├── connections/
  │   └── related-topics.md
  └── insights/
      └── synthesis.md
```

## 🔍 Health Check

Run health check to find issues:

```bash
npm run health-check
```

This will:
- Find inconsistencies
- Suggest missing pieces
- Recommend new articles
- Find interesting connections

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

## 🙏 Acknowledgments

- Built with OpenClaw
- Designed for Obsidian
- Powered by LLM

## 📧 Contact

- GitHub: [@duynguyendevit-ux](https://github.com/duynguyendevit-ux)
- Email: duynguyen.dev.it@gmail.com
