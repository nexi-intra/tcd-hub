import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface FloatingShape {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  opacity: number
  shape: 'circle' | 'square' | 'triangle'
}

export function AnimatedBackground() {
  const [shapes, setShapes] = useState<FloatingShape[]>([])

  useEffect(() => {
    const generatedShapes: FloatingShape[] = []
    const shapeTypes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle']
    
    for (let i = 0; i < 15; i++) {
      generatedShapes.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 80 + 40,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 5,
        opacity: Math.random() * 0.04 + 0.02,
        shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)]
      })
    }
    
    setShapes(generatedShapes)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            rotate: shape.shape === 'square' ? [0, 360] : [0, 180, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            delay: shape.delay,
            ease: "easeInOut",
          }}
        >
          {shape.shape === 'circle' && (
            <div
              className="w-full h-full rounded-full bg-primary"
              style={{ opacity: shape.opacity }}
            />
          )}
          {shape.shape === 'square' && (
            <div
              className="w-full h-full rounded-lg bg-accent"
              style={{ opacity: shape.opacity }}
            />
          )}
          {shape.shape === 'triangle' && (
            <div
              className="w-full h-full bg-secondary"
              style={{
                opacity: shape.opacity,
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              }}
            />
          )}
        </motion.div>
      ))}
      
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8 animate-pulse" style={{ animationDuration: '8s' }} />
      
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl"
        animate={{
          scale: [1.3, 1, 1.3],
          opacity: [0.55, 0.35, 0.55],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 w-[28rem] h-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}
