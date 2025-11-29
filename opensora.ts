import dotenv from "dotenv"
dotenv.config();

const token = process.env.OPENAI_TOKEN

if (!token) {
  throw new Error("OPENAI_TOKEN is not defined in the environment variables")
}

class OpenSora {
  async video(prompt: string) {
    try {
      let response = await fetch(
        "https://api.openai.com/v1/videos",
        {method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/form-data`
          },
          body: JSON.stringify({
            model: `sora-2`,
            prompt: prompt,
            size: `1280x720`,
            seconds: `8`
          })
        }
      )

      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }

      const data = await response.json()

      while (data.status === 'in_progress' || data.status === 'queued') {
        response = await fetch(`https://api.openai.com/v1/videos/${data.id}`)
        
        // таймаут 2 секунды
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      if (data.status === 'failed') {
        return 'Video generation failed'
      }      

      const content = await fetch(`https://api.openai.com/v1/videos/${data.id}/content`, {
        headers: {
          Authorization: `Bearer ${token}`
        } 
      })

      if (content.ok) {
        return content.blob()
      }

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