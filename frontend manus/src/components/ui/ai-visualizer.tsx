'use client';

import { useEffect, useRef } from 'react';

export default function AIVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}
    
    // Set canvas dimensions
    canvas.width = 200;
    canvas.height = 200;
    
    // Animation variables
    const particles: Particle[] = [];
    const particleCount = 100;
    let hue = 0;
    
    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      
      constructor() {
        this.x = Math.random() * (canvas?.width || 200);
        this.y = Math.random() * (canvas?.height || 200);
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = `hsl(${hue}, 100%, 50%)`;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Bounce off edges
        if (this.x > (canvas?.width || 200) || this.x < 0) {
          this.speedX = -this.speedX;
        }
        if (this.y > (canvas?.height || 200) || this.y < 0) {
          this.speedY = -this.speedY;
        }
        
        // Slowly reduce size
        if (this.size > 0.2) {this.size -= 0.05;}
      }
      
      draw() {
        if (ctx) {
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Initialize particles
    function init() {
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }
    
    // Animation loop
    function animate() {
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw each particle
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        // If particle is too small, replace it
        if (particles[i].size <= 0.2) {
          particles.splice(i, 1);
          i--;
          
          // Create a new particle
          particles.push(new Particle());
        }
      }
      
      // Slowly change hue
      hue += 0.5;
      
        requestAnimationFrame(animate);
      }
    }
    
    // Start animation
    init();
    animate();
    
    // Cleanup on unmount
    return () => {
      // No specific cleanup needed for canvas
    };
  }, []);
  
  return (
    <div className="flex justify-center">
      <canvas 
        ref={canvasRef} 
        className="rounded-lg bg-black/5 dark:bg-white/5"
      />
    </div>
  );
}
