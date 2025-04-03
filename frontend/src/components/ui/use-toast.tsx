// Simplified toast hook for notifications
import { useState, useCallback } from "react"

type ToastType = {
  id?: string
  title: string
  description: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast = useCallback(
    ({ title, description, variant = "default" }: ToastType) => {
      const id = Date.now().toString()
      
      setToasts((currentToasts) => [
        ...currentToasts,
        { title, description, variant, id },
      ])

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((toast) => toast.id !== id)
        )
      }, 5000)
    },
    []
  )

  return {
    toast,
    toasts,
    dismiss: (toastId: string) => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== toastId)
      )
    },
  }
}

export type { ToastType }
