# Lyrics Lab: Feature Specification for LetsMake.Music

## 1. Core Vision: The Social Songwriting Experience

The Lyrics Lab is no longer a standalone "professional" tool. It is now a core, gamified, and social component of the **LetsMake.Music** creation workflow. The goal is to make writing lyrics as fun and easy as using a TikTok filter. It is designed for a mobile-first, consumer audience with no musical experience. The guiding principle is **"You are a songwriter. You just don't know it yet."**

## 2. User Flow: From Vibe to Verse

The user journey is designed to be intuitive and visually engaging, mirroring the simplicity of popular social media apps.

1.  **The "Vibe" Screen:** Instead of a blank text box, the user is greeted with a vibrant, interactive screen.
    *   **Prompt:** A single, engaging question: **"What's your song about?"**
    *   **Inspiration Bubbles:** Floating, tappable bubbles with trending themes (e.g., "My last vacation," "My pet," "A breakup," "Our friendship"). Tapping a bubble pre-fills the prompt.
    *   **AI Vibe Scanner:** A button that says **"Scan My Vibe."** This would (in a future version) use AI to suggest themes based on the user's recent camera roll or Spotify listening history.

2.  **The "Structure" Screen (Simplified):**
    *   Instead of complex musical terms, we use simple, relatable language.
    *   **Song Length:** A simple slider with three options: **Short (1:00)**, **Medium (2:00)**, **Full Song (3:00)**.
    *   **Song Structure:** Visual, tappable icons representing the song's flow. For example:
        *   `[Verse] -> [Chorus] -> [Verse] -> [Chorus]` (Simple)
        *   `[Verse] -> [Pre-Chorus] -> [Chorus] -> [Bridge] -> [Chorus]` (Classic)
        *   The AI will default to the most common structure, but users can tap to change it.

3.  **The "Rhyme Time" Screen (Introducing Rhymization):**
    *   This is where the magic happens. We introduce **"Rhymization"** as a fun, AI-powered feature.
    *   **Rhyme Scheme Selector:** Simple, visual options:
        *   **Perfect Rhymes:** (AABB) - "Like a classic poem."
        *   **Storyteller Rhymes:** (ABCB) - "Like a folk song."
        *   **Loose Rhymes:** (Slant Rhymes) - "Like modern rap."
        *   **No Rhymes:** (Free Verse) - "Like a heartfelt speech."
    *   **The Rhymization Engine™:** As the AI generates lyrics, it will visually highlight the rhyming words, creating a satisfying, almost game-like experience. The rhymes will animate and connect on screen.

4.  **The "Lyrics Board":**
    *   The generated lyrics appear on a visually appealing, scrollable board.
    *   **Tappable & Editable:** Users can tap on any line to edit it. When they do, the AI provides real-time suggestions.
    *   **"Get Another Line" Button:** Don't like a line? Tap a refresh icon next to it, and the AI will generate a new one in the same style and rhyme scheme.
    - **"Add a Personal Touch"**: A dedicated button that prompts the user with questions like "Add a specific name?" or "Mention a place that's important to you?" to make the lyrics more personal.

## 3. Key Feature: Rhymization Engine™

This is the core innovation of the new Lyrics Lab. It turns the abstract concept of rhyming into a visual and interactive experience.

-   **Visual Feedback:** As lyrics are generated, rhyming words will be highlighted in the same color and a subtle animation will connect them.
-   **Interactive Rhyme Suggestions:** When a user edits a line, the AI will suggest a list of words that rhyme with the corresponding line, helping them maintain the song's structure.
-   **"Rhyme Score":** A fun, non-critical score that tells the user how consistent their rhyme scheme is, encouraging them to refine their lyrics.

## 4. API Integration (`sunoapi.org`)

The entire Lyrics Lab will be powered by the `sunoapi.org` API, leveraging its specific strengths for a consumer-facing platform.

-   **Lyrics Generation Endpoint:** We will use the dedicated `/api/v1/lyrics` endpoint. The user's prompt from the "Vibe" screen will be sent to this endpoint.
-   **Song Structure Tags:** The generated lyrics, with their `[Verse]`, `[Chorus]`, etc. tags, will be parsed and displayed on the Lyrics Board.
-   **Music Generation:** Once the user approves the lyrics, the full text (up to the 2,500 character limit) will be sent to the `/api/v1/generate` endpoint to create the song.

## 5. Integration with Music Video Creation

The Lyrics Lab is the first step in the primary user journey of creating a hyper-personalized music video.

-   **Seamless Transition:** After finalizing the lyrics and generating the song, the user is immediately taken to the **"Video Lab."**
-   **Lyrical Cues for Media Selection:** The Video Lab will use the generated lyrics to suggest photos and videos from the user's camera roll. For example, if the lyrics mention "the beach," the app will surface photos taken at a beach.
-   **Timestamped Lyrics:** We will use the timestamped lyrics feature from `sunoapi.org` to perfectly sync the user's photos and videos to the words being sung, creating a dynamic and professional-looking music video.

## 6. Social and Collaborative Features

The Lyrics Lab is designed to be inherently social.

-   **"Finish My Lyric" Challenge:** A user can write one line and post it as a challenge. Other users can submit the next line, and the original poster can choose their favorite to continue the song.
-   **Co-writing Sessions:** Two users can work on the same Lyrics Board in real-time, collaborating on a song together.
-   **Shareable Lyrics Cards:** Users can export their lyrics as visually appealing, shareable images for Instagram Stories or TikTok.

By reframing the Lyrics Lab as a fun, social, and gamified experience, we align it perfectly with the **LetsMake.Music** vision of turning everyone into a music video star.
