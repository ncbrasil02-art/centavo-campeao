import React from 'react';
import { motion } from 'framer-motion';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">MC BRASIL</h1>
          <nav className="flex gap-6">
            <a href="#hero" className="text-sm font-medium hover:text-primary transition-colors">Início</a>
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Recursos</a>
            <a href="#cta" className="text-sm font-medium hover:text-primary transition-colors">Solicitar Demo</a>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        <section id="hero" className="min-h-screen flex items-center justify-center container mx-auto px-6">
          <div className="text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-6"
            >
              Transforme sua Cidade em uma Máquina de Vendas
            </motion.h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Plataforma de Leilão de Centavos profissional e automática.
            </p>
            <div className="flex gap-4 justify-center">
              <button className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-full hover:scale-105 transition-transform">Solicitar Demonstração</button>
              <button className="px-8 py-4 border border-white/20 rounded-full hover:bg-white/10 transition-colors">Ver Funcionando</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
