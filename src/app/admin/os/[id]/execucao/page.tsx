import { redirect } from 'next/navigation'

export default function ExecucaoRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/os/${params.id}`)
}
