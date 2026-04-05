# Blog Drafts

Drop your personal reflections here as `.md` or `.txt` files.

The AI will:
1. Read your draft
2. Strip all personal information (names, places, relationships)
3. Create a universal spiritual lesson
4. Translate to both English and Telugu
5. Publish as a blog post

## Format
Just write naturally! No special format required.

Example: `my-reflection.md`
```
Today I learned something important from my colleague at work.
We were arguing about a project deadline, and I realized...
```

## How it works
- GitHub Actions runs daily at midnight IST
- It checks this folder for new `.md` / `.txt` files
- Processes each draft with Gemini AI  
- Moves published drafts to `published/` subfolder
