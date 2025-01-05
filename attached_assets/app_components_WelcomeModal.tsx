'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(true)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="fixed bottom-4 right-4">
          Open Welcome Modal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            Welcome to Beam – Early Access
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="w-full h-40 relative overflow-hidden rounded-md">
            <Image
              src="/placeholder.svg?height=160&width=425"
              alt="Beam app banner"
              layout="fill"
              objectFit="cover"
            />
          </div>
          <DialogDescription className="text-muted-foreground text-base">
            Thank you for trying out Beam – a platform designed to make sharing and reviewing photos faster and easier.
          </DialogDescription>
          <Separator className="bg-border" />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Early Testing Phase</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Bugs are likely (thanks for your patience!).</li>
              <li>Some features you'd expect might not be here yet.</li>
            </ul>
          </div>
          <Separator className="bg-border" />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">We Value Your Feedback</h3>
            <p className="text-sm text-muted-foreground">
              If you spot an issue or have ideas to share,{' '}
              <a
                href="#"
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  console.log('Feedback link clicked')
                }}
              >
                submit feedback here
              </a>
              .
            </p>
          </div>
          <p className="font-medium text-foreground">Thank you for being part of this journey!</p>
          <Button className="w-full" onClick={() => setIsOpen(false)}>
            Got it, let's go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

