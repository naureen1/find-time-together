# Find Time Together

A constraint-aware group scheduling prototype exploring what happens when there is no perfect meeting time.

**[View the live prototype](https://naureen.design/find-time-together/)**

## The idea

When everyone's availability overlaps, scheduling is straightforward. The more interesting problem appears when no ideal time exists: the organizer has to understand which constraints can reasonably give.

I explored how Cal.com might make those trade-offs visible rather than hiding the decision behind an opaque recommendation.

Find Time Together lets an organizer adjust meeting duration and working-hours flexibility, see how those changes affect the available options, and understand why a particular time is the least disruptive choice.

## What I explored

- Constraint-aware group availability across four time zones
- Immediate feedback showing what changes when constraints are adjusted
- Perfect matches versus times that require flexibility
- A least-disruptive alternative when no ideal time exists
- Participant-level explanations of scheduling trade-offs
- Keyboard-accessible interaction and focus management

## How it works

The prototype uses mocked calendar availability, but the scheduling results are calculated rather than hard-coded.

The same evaluation state drives the availability grid, recommendations and explanations, so the interface can explain the trade-offs behind each result.

## Built with

React · TypeScript · Vite · CSS

The prototype was designed and built as an exploration for my application to Cal.com's Senior Product Designer role.

No real calendars are connected and no scheduling data is sent anywhere.