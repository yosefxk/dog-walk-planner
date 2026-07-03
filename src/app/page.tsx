import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Calendar from "@/components/Calendar"
import { fetchState } from "@/app/actions"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const state = await fetchState()

  return (
    <Calendar initialState={state} userEmail={session.user.email || ""} />
  )
}
