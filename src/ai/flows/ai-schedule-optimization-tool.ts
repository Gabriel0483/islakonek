'use server';
/**
 * @fileOverview An AI agent that optimizes maritime route schedules and vessel assignments.
 *
 * - optimizeSchedule - A function that handles the schedule optimization process.
 * - AIScheduleOptimizationInput - The input type for the optimizeSchedule function.
 * - AIScheduleOptimizationOutput - The return type for the optimizeSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIScheduleOptimizationInputSchema = z.object({
  existingSchedule: z.array(z.object({
    routeId: z.string().describe('Unique identifier for the route.'),
    routeName: z.string().describe('Name of the route (e.g., "Manila-Cebu").'),
    origin: z.string().describe('Departure port.'),
    destination: z.string().describe('Arrival port.'),
    scheduledDeparture: z.string().datetime().describe('Scheduled departure date and time (ISO 8601).'),
    scheduledArrival: z.string().datetime().describe('Scheduled arrival date and time (ISO 8601).'),
    vesselTypeRequired: z.string().describe('Type of vessel required for this route (e.g., "RoRo", "FastCraft").'),
    currentVesselId: z.string().optional().describe('ID of the vessel currently assigned to this route, if any.'),
    expectedDurationHours: z.number().describe('Expected duration of the trip in hours under normal conditions.'),
  })).describe('Current or planned schedule of routes.'),
  availableVessels: z.array(z.object({
    vesselId: z.string().describe('Unique identifier for the vessel.'),
    vesselName: z.string().describe('Name of the vessel.'),
    type: z.string().describe('Type of the vessel (e.g., "RoRo", "FastCraft").'),
    passengerCapacity: z.number().describe('Maximum passenger capacity.'),
    cargoCapacityTEU: z.number().describe('Maximum cargo capacity in TEU.'),
    currentLocation: z.string().describe('Current port location of the vessel.'),
    availableFrom: z.string().datetime().describe('Timestamp when the vessel becomes available (ISO 8601).'),
    availableUntil: z.string().datetime().optional().describe('Timestamp when the vessel is no longer available (e.g., for maintenance, ISO 8601).'),
  })).describe('List of available vessels with their details.'),
  demandForecast: z.array(z.object({
    routeId: z.string().describe('ID of the route.'),
    date: z.string().date().describe('Date for the demand forecast (YYYY-MM-DD).'),
    passengerDemand: z.number().describe('Forecasted passenger demand for the route on this date.'),
    cargoDemandTEU: z.number().describe('Forecasted cargo demand in TEU for the route on this date.'),
  })).describe('Forecasted demand for passengers and cargo per route and date.'),
  weatherForecast: z.array(z.object({
    location: z.string().describe('Port or route segment location.'),
    date: z.string().date().describe('Date for the weather forecast (YYYY-MM-DD).'),
    conditions: z.string().describe('General weather conditions (e.g., "clear", "rain", "storm", "fog").'),
    windSpeedKts: z.number().optional().describe('Wind speed in knots, if applicable.'),
    waveHeightMeters: z.number().optional().describe('Wave height in meters, if applicable.'),
    visibilityKm: z.number().optional().describe('Visibility in kilometers, if applicable.'),
  })).describe('Weather forecast for relevant locations and dates.'),
  operationalConstraints: z.array(z.string()).optional().describe('List of operational constraints (e.g., "max 2 trips per vessel per day", "vessel X cannot operate in fog", "route Manila-Cebu requires a vessel with passengerCapacity > 500").'),
});

export type AIScheduleOptimizationInput = z.infer<typeof AIScheduleOptimizationInputSchema>;

const AIScheduleOptimizationOutputSchema = z.object({
  optimizedSchedule: z.array(z.object({
    routeId: z.string().describe('Unique identifier for the route.'),
    routeName: z.string().describe('Name of the route.'),
    origin: z.string().describe('Departure port.'),
    destination: z.string().describe('Arrival port.'),
    optimizedDeparture: z.string().datetime().describe('Optimized departure date and time (ISO 8601).'),
    optimizedArrival: z.string().datetime().describe('Optimized arrival date and time (ISO 8601).'),
    assignedVesselId: z.string().describe('ID of the vessel assigned to this optimized trip.'),
    estimatedDurationHours: z.number().describe('Estimated duration of the trip in hours based on optimization.'),
    capacityUtilization: z.object({
      passengers: z.number().min(0).max(100).describe('Percentage of passenger capacity utilized (0-100).'),
      cargo: z.number().min(0).max(100).describe('Percentage of cargo capacity utilized (0-100).'),
    }).describe('Estimated capacity utilization for the trip.'),
  })).describe('Proposed optimized schedule of routes with assigned vessels.'),
  vesselAssignmentsSummary: z.array(z.object({
    vesselId: z.string().describe('Unique identifier for the vessel.'),
    vesselName: z.string().describe('Name of the vessel.'),
    assignedTripsCount: z.number().describe('Number of trips assigned to this vessel.'),
    totalOperatingHours: z.number().describe('Total estimated operating hours for this vessel in the optimized schedule.'),
    maxCapacityReached: z.boolean().optional().describe('True if the vessel reached its maximum operational capacity (e.g., max trips or max hours).'),
  })).describe('Summary of vessel assignments.'),
  optimizationRationale: z.string().describe('Detailed explanation of the optimization choices, including how demand, weather, and constraints were considered. Explain trade-offs made if any.'),
  warnings: z.array(z.string()).optional().describe('Any warnings or issues encountered during optimization (e.g., "Route X could not be fully served due to vessel limitations", "Vessel Y is underutilized").'),
});

export type AIScheduleOptimizationOutput = z.infer<typeof AIScheduleOptimizationOutputSchema>;

export async function optimizeSchedule(input: AIScheduleOptimizationInput): Promise<AIScheduleOptimizationOutput> {
  return aIScheduleOptimizationFlow(input);
}

const scheduleOptimizationPrompt = ai.definePrompt({
  name: 'aIScheduleOptimizationPrompt',
  input: {
    schema: z.object({
      existingSchedule: z.string().describe('JSON string of current schedule.'),
      availableVessels: z.string().describe('JSON string of available vessels.'),
      demandForecast: z.string().describe('JSON string of demand forecast.'),
      weatherForecast: z.string().describe('JSON string of weather forecast.'),
      operationalConstraints: z.array(z.string()).optional().describe('List of operational constraints.'),
    })
  },
  output: { schema: AIScheduleOptimizationOutputSchema },
  prompt: `You are an expert maritime operations manager specializing in optimizing route schedules and vessel assignments.
Your goal is to maximize vessel utilization and profitability while ensuring reliable service, based on the provided data.

You need to analyze the following information to generate an optimized schedule and vessel assignments:

Current or planned schedule (JSON):
{{{existingSchedule}}}

Available vessels (JSON):
{{{availableVessels}}}

Demand forecast (JSON):
{{{demandForecast}}}

Weather forecast (JSON):
{{{weatherForecast}}}

Operational constraints:
{{#if operationalConstraints.length}}
{{#each operationalConstraints}}
- {{{this}}}
{{/each}}
{{else}}
No specific operational constraints provided.
{{/if}}

Based on the above, generate an optimized schedule and vessel assignments.
For each trip in the optimized schedule, assign an appropriate vessel, adjust departure/arrival times if necessary (e.g., due to weather or demand), and estimate capacity utilization.
Ensure the vessel chosen matches the route's required vessel type and is available within its availableFrom/availableUntil window.
If weather conditions are severe for a route, suggest adjustments to schedule, re-assignment of vessels, or warnings.
Consider maximizing capacity utilization for both passengers and cargo based on demand, respecting vessel capacities.
Explain your reasoning for the optimization choices, including how demand, weather, and constraints influenced your decisions.
Provide warnings if any routes cannot be fully served, if vessels are significantly underutilized, or if operational constraints are violated.

Output the result strictly in the JSON format described in the output schema.`,
});

const aIScheduleOptimizationFlow = ai.defineFlow(
  {
    name: 'aIScheduleOptimizationFlow',
    inputSchema: AIScheduleOptimizationInputSchema,
    outputSchema: AIScheduleOptimizationOutputSchema,
  },
  async (input) => {
    const promptInput = {
      existingSchedule: JSON.stringify(input.existingSchedule, null, 2),
      availableVessels: JSON.stringify(input.availableVessels, null, 2),
      demandForecast: JSON.stringify(input.demandForecast, null, 2),
      weatherForecast: JSON.stringify(input.weatherForecast, null, 2),
      operationalConstraints: input.operationalConstraints,
    };
    const { output } = await scheduleOptimizationPrompt(promptInput);
    if (!output) {
      throw new Error("No output received from the AI model.");
    }
    return output;
  }
);
