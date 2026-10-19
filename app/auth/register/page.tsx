'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/auth/login?registro=1') }, [])
  return null
}