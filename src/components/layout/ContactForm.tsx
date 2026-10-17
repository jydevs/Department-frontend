'use client';

import { useState, useId } from 'react';
import { Button } from '@/components/ui/Button';
import { publicApiBase } from '@/lib/api/config';
import { DEFAULT_CONTACT_FORM, type ContactFormConfig } from './config';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function ContactForm({ config = DEFAULT_CONTACT_FORM }: { config?: ContactFormConfig }) {
  const [state, setState] = useState<FormState>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const uid = useId();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('loading');

    try {
      const response = await fetch(
        `${publicApiBase()}/storefront/contact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error('Error enviando mensaje');

      setState('success');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });

      setTimeout(() => setState('idle'), 3000);
    } catch (error) {
      console.error('Contact form error:', error);
      setState('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-display text-display-lg text-dept-white mb-10">
        {config.heading}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor={`${uid}-name`} className="block text-sm mb-2 text-dept-gray-300 font-condensed tracking-[0.1em]">
              {config.nameLabel}
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white focus:border-dept-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-email`} className="block text-sm mb-2 text-dept-gray-300 font-condensed tracking-[0.1em]">
              {config.emailLabel}
            </label>
            <input
              id={`${uid}-email`}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white focus:border-dept-white focus:outline-none"
            />
          </div>

          {config.showPhone && (
          <div className="md:col-span-2">
            <label htmlFor={`${uid}-phone`} className="block text-sm mb-2 text-dept-gray-300 font-condensed tracking-[0.1em]">
              {config.phoneLabel}
            </label>
            <input
              id={`${uid}-phone`}
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white focus:border-dept-white focus:outline-none"
            />
          </div>
          )}

          <div className="md:col-span-2">
            <label htmlFor={`${uid}-subject`} className="block text-sm mb-2 text-dept-gray-300 font-condensed tracking-[0.1em]">
              {config.subjectLabel}
            </label>
            <input
              id={`${uid}-subject`}
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white focus:border-dept-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor={`${uid}-message`} className="block text-sm mb-2 text-dept-gray-300 font-condensed tracking-[0.1em]">
              {config.messageLabel}
            </label>
            <textarea
              id={`${uid}-message`}
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 text-white focus:border-dept-white focus:outline-none resize-none"
            />
          </div>
        </div>

        {state === 'error' && (
          <p className="text-dept-red-light font-condensed text-sm tracking-[0.1em]">{config.errorMessage}</p>
        )}

        {state === 'success' && (
          <p className="text-dept-white font-condensed text-sm tracking-[0.1em]">{config.successMessage}</p>
        )}

        <Button
          type="submit"
          disabled={state === 'loading'}
          variant="red"
          className="w-full md:w-auto"
          data-testid="contact-submit"
        >
          {state === 'loading' ? config.loadingLabel : config.submitLabel}
        </Button>
      </form>
    </div>
  );
}
