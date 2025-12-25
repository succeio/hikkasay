import dotenv from "dotenv"
dotenv.config();

const token = process.env.OPENAI_TOKEN

if (!token) {
  throw new Error("OPENAI_TOKEN is not defined in the environment variables")
}

class OpenSora {
  async video(prompt: string) {
    try {
      const formData = new FormData()
      formData.append("model", "sora-2")
      formData.append("prompt", prompt)

      let response = await fetch(
        "https://api.openai.com/v1/videos",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData
        }
      )

      if (!response.ok) {
        const text = await response.text()
        let msg = text
        try {
          const parsed = JSON.parse(text)
          msg = `${parsed.error?.code}: ${parsed.error?.message}`
        }
        catch {}
        throw new Error(`Content fetch failed: ${msg}`)
      }

      let data = await response.json()


      const startedAt = Date.now()
      const TIMEOUT = 2 * 60 * 1000

      while (data.status === "queued" || data.status === "in_progress") {

        if (Date.now() - startedAt > TIMEOUT) {
          throw new Error("Video generation timeout")
        }

        await new Promise(r => setTimeout(r, 2000))

        response = await fetch(
          `https://api.openai.com/v1/videos/${data.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )

        data = await response.json()
      }

      if (data.status === "failed") {
        throw new Error("Video generation failed")
      }

      const content = await fetch(
        `https://api.openai.com/v1/videos/${data.id}/content`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!content.ok) {
        const text = await content.text()
        let msg = text
        try {
          const parsed = JSON.parse(text)
          msg = `${parsed.error?.code}: ${parsed.error?.message}`
        }
        catch {}
        throw new Error(`Content fetch failed: ${content.status}:  ${msg}`)
      }

      return await content.blob()

    } catch (error) {
      if (error instanceof Error) {
        console.error("Проблема сетевого запроса", error)
        return "Проблема сетевого запроса: " + error.message
      } else {
        console.error("Неожиданная проблема:", error)
        return "Привышен лимит ожидания ответа модели."
      }
    }
  }
}

export default OpenSora