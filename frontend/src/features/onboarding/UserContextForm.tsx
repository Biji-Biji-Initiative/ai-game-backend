'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore, GamePhase } from '@/store/useGameStore';

// Define the user info interface to match the store
interface UserInfo {
  name: string;
  email: string;
  professionalTitle: string;
  location: string;
}
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function UserContextForm() {
  const router = useRouter();
  const { setGamePhase, saveUserInfo } = useGameStore();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    professionalTitle: '',
    location: ''
  });
  
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    professionalTitle: '',
    location: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    
    if (!formData.professionalTitle.trim()) {
      newErrors.professionalTitle = 'Professional title is required';
      isValid = false;
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Save user context to the game store
      const userInfo: UserInfo = {
        name: formData.name,
        email: formData.email,
        professionalTitle: formData.professionalTitle,
        location: formData.location
      };
      saveUserInfo(userInfo);
      
      // Set game phase to traits assessment
      setGamePhase(GamePhase.TRAITS);
      
      // Navigate to the traits page
      router.push('/traits');
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Tell Us About Yourself</CardTitle>
        <CardDescription className="text-center">
          This information helps us personalize your human edge profile
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="professionalTitle">Professional Title</Label>
            <Input
              id="professionalTitle"
              name="professionalTitle"
              placeholder="e.g. Software Engineer, Designer, Manager"
              value={formData.professionalTitle}
              onChange={handleChange}
              className={errors.professionalTitle ? 'border-red-500' : ''}
            />
            {errors.professionalTitle && (
              <p className="text-sm text-red-500">{errors.professionalTitle}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="City, Country"
              value={formData.location}
              onChange={handleChange}
              className={errors.location ? 'border-red-500' : ''}
            />
            {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
          </div>
        </CardContent>
        
        <CardFooter>
          <Button type="submit" className="w-full">Continue</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
