# Mochi Cards Exporter Plugin

This is an [Obsidian](https://obsidian.md/) plugin that exports markdown notes to [Mochi](https://mochi.cards) flashcards, which is an awesome flashcard app that is based on markdown. I highly recommend it, if you use flashcards and spaced repetition to study or remember anything.

## Features

- Create cards using tags in obsidian and export them to Mochi, simple as that.
- Supports images, videos, sounds, or any other attachments that Mochi supports.

## Usage

To use this plugin :
- Mark a line in your notes with the default `#card` tag. You also have the ability to customize this in the plugin's settings. This line will be the front face of your card
- To mark the end of a card, use the section dividers `---` or `***`.
- Any text between the first line marked with the card tag and a section divider will be the back face of your card.

**NOTE** The plugin exports your cards to a `.mochi` file. This file is just a zip file with your exported cards and your attachments. You can import this file using your Mochi app.

## Sample format

```md
## Term to be front face of your flash card #card

Any Text, image, or other attachment types supported by Mochi

---

```

## Installation

To install and use this plugin, search for *Mochi Card Exporter* in the Obsidian Community Plugins from within Obsidian.

## Open Source

This is an open source project, so feel free to contribute !!!

Check out the repo at github [Mochi-Card-Exporter](https://github.com/kalbetredev/mochi-cards-exporter)