export {}

declare global {
  interface Window {
    tokenBridge?: {
      getData: () => Promise<{
        total: number
        history: Array<{
          id: string
          amount: number
          before: number
          after: number
          ts: number
        }>
      }>
      setData: (data: {
        total: number
        history: Array<{
          id: string
          amount: number
          before: number
          after: number
          ts: number
        }>
      }) => Promise<{
        total: number
        history: Array<{
          id: string
          amount: number
          before: number
          after: number
          ts: number
        }>
      }>
    }
  }
}
