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
      formData.append("model", "sora-2-pro")
      formData.append("prompt", prompt)
      formData.append("size", "1280x720")
      formData.append("seconds", "8")

      let response = await fetch(
        "https://api.openai.com/v1/videos",
        {method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/form-data`
          },
          body: formData
        }
      )

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status} ${response.statusText}`)
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
      } else {
        throw new Error(`Ошибка: ${content.status} ${content.statusText}`)
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