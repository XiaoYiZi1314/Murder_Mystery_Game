"use client";
import { Button } from '@/components/ui';
export default function ErrorPage({reset}:{reset:()=>void}){return <section role="alert"><h2>内容暂时无法加载</h2><p>请检查筛选条件或稍后重试。</p><Button onClick={reset}>重新加载</Button></section>;}
