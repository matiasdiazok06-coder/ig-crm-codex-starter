'use client';

import { LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end space-y-3 text-right">
      {open && (
        <Card className="max-w-xs border-[#2f2f35] bg-[#16161d] p-5 text-left shadow-black/40">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg">¿No ves tus mensajes?</CardTitle>
          </CardHeader>
          <CardContent className="mt-2 space-y-3 text-sm text-zinc-300">
            <p>1. Revisá que hayas autorizado el acceso a Instagram.</p>
            <p>2. Refrescá el Inbox para traer mensajes nuevos.</p>
            <p>3. Activá "Herramientas conectadas" en Instagram → Privacidad → Mensajes.</p>
          </CardContent>
        </Card>
      )}
      <Button
        type="button"
        size="lg"
        variant="primary"
        onClick={() => setOpen((value) => !value)}
        className="shadow-glow"
      >
        <LifeBuoy className="h-5 w-5" /> Ayuda
      </Button>
    </div>
  );
}
