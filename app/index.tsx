import React, { useEffect, useState } from "react";
import { Text, View, Button, StyleSheet, FlatList } from "react-native";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { EventEmitter } from "fbemitter";

const emitter = new EventEmitter();
const QUEUE_EVENT = "QUEUE_API_EVENT";
const BACKGROUND_TASK = "EXECUTE_QUEUED_EVENTS";

let eventQueue: string[] = [];

TaskManager.defineTask(BACKGROUND_TASK, async () => {
  console.log("[Background Fetch Triggered]");
  if (eventQueue.length >= 5) {
    console.log(`✅ Sending ${eventQueue.length} queued events:`);
    eventQueue = []; // Clear queue
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } else {
    console.log(
      `🕒 Not enough events to send. Current count: ${eventQueue.length}`
    );
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }
});

async function registerBackgroundTask() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
    minimumInterval: 10, // run every 60 seconds
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export default function App() {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    checkStatusAsync();
  }, []);

  const checkStatusAsync = async () => {
    await registerBackgroundTask();
    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_TASK
    );
    console.log("Background Fetch Status:", status);
    console.log("Is Background Task Registered:", isRegistered);
  };

  useEffect(() => {
    const subscription = emitter.addListener(QUEUE_EVENT, (event: string) => {
      console.log("➕ Queued event:", event);
      eventQueue.push(event);
      setEvents([...eventQueue]);
    });

    return () => subscription.remove();
  }, []);

  const addRandomEvent = () => {
    const newEvent = `event-${Date.now()}`;
    emitter.emit(QUEUE_EVENT, newEvent);
  };
  const triggerManualFlush = async () => {
    console.log("🔄 Triggering manual flush");
    const result = await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
      minimumInterval: 1,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("Manual flush result:", result);
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Queued Event System</Text>
      <Button title="Add Random Event" onPress={addRandomEvent} />
      <Button title="Trigger Background Flush" onPress={triggerManualFlush} />
      <Text style={styles.subtitle}>Queued Events ({events.length})</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item}
        renderItem={({ item, index }) => (
          <Text>
            {index + 1}. {item}
          </Text>
        )}
        style={{ marginTop: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
  },
});
