import { type JobContext, type JobProcess, defineAgent } from '@livekit/agents';
import * as silero from '@livekit/agents-plugin-silero';
import { voice, llm } from '@livekit/agents';
import * as livekit from '@livekit/agents-plugin-livekit';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    console.log('Prewarming agent...');
    proc.userData.vad = await silero.VAD.load();
    proc.userData.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    console.log('Agent prewarmed successfully');
  },

  entry: async (ctx: JobContext) => {
    console.log('Agent entry called');
    const vad = ctx.proc.userData.vad as silero.VAD;
    const supabase = ctx.proc.userData.supabase as SupabaseClient;

    class ReceptionistAgent extends voice.Agent {
      constructor() {
        super({
          instructions: `You are Zavira, a professional voice AI receptionist. Your role is to:
          - Greet visitors warmly and professionally
          - Answer questions about office hours, location, and services
          - Schedule appointments using the available tools
          - Check existing appointments
          - Provide helpful information and direct calls appropriately
          - Be polite, efficient, and maintain a friendly tone
          Use the database tools to manage appointment information.`,
          tools: {
            getAppointments: llm.tool({
              description: 'Retrieve appointments for a specific date or person',
              parameters: z.object({
                date: z.string().optional().describe('Date in YYYY-MM-DD format'),
                name: z.string().optional().describe('Person name'),
              }),
              execute: async ({ date, name }) => {
                let query = supabase.from('appointments').select('*');
                if (date) query = query.eq('appointment_date', date);
                if (name) query = query.ilike('full_name', `%${name}%`);
                const { data, error } = await query;
                if (error) return `Error: ${error.message}`;
                return data ? JSON.stringify(data) : 'No appointments found';
              },
            }),
            scheduleAppointment: llm.tool({
              description: 'Schedule a new appointment',
              parameters: z.object({
                name: z.string().describe('Visitor name'),
                date: z.string().describe('Date in YYYY-MM-DD format'),
                time: z.string().describe('Time in HH:MM format'),
                purpose: z.string().describe('Purpose of the visit'),
              }),
              execute: async ({ name, date, time, purpose }) => {
                const { data, error } = await supabase
                  .from('appointments')
                  .insert([{ full_name: name, appointment_date: date, appointment_time: time, notes: purpose }]);
                if (error) return `Error scheduling: ${error.message}`;
                return 'Appointment scheduled successfully';
              },
            }),
          },
        });
      }
    }

    const session = new voice.AgentSession({
      stt: 'assemblyai/universal-streaming:en',
      llm: 'openai/gpt-4o-mini',
      tts: 'cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc',
      turnDetection: new livekit.turnDetector.MultilingualModel(),
      vad: vad,
    });

    await session.start({
      agent: new ReceptionistAgent(),
      room: ctx.room,
    });

    await ctx.connect();
  },
});