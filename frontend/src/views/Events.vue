<script setup lang="ts">
import { InteractionType } from "@azure/msal-browser";
import { ref, watchEffect } from "vue";
import Badge from "../components/Badge.vue";
import EditEvent from "../components/EditEvent.vue";
import EventDetails from "../components/EventDetails.vue";
import Modal from "../components/Modal.vue";
import Table from "../components/Table.vue";
import { useIsAuthenticated } from "../composables/useIsAuthenticated";
import { useMsalAuthentication } from "../composables/useMsalAuthentication";
import { tokenRequest } from "../configs/msalAuthConfig";
import {
  deleteEvent,
  getCategories,
  getEvents,
  getEventsByFilter,
  getLecturerCategories,
  updateEvent,
} from "../service/api";
import { formatDateTime, inputConstraits, sortByDateInPlace, sortDirections } from "../utils";
import { useAuth } from "../utils/useAuth";
import { useEditing } from "../utils/useEditing";
import { useIsLoading } from "../utils/useIsLoading";

const { isAuthenticated, isLecturer, isAuthLoading } = useAuth();
const isMsalAuthenticated = useIsAuthenticated();
const { error, isAdminMsal } = useMsalAuthentication(InteractionType.Silent, tokenRequest);

const events = ref([]);
const { editingItem: currentEvent, withNoEditing, isEditing, startEditing, stopEditing } = useEditing({});
const categories = ref([]);
const { isLoading, setIsLoading } = useIsLoading(true);
const isEditSuccessModalOpen = ref(false);
const isEditErrorModalOpen = ref(false);
const isCancelSuccessModalOpen = ref(false);
const isCancelErrorModalOpen = ref(false);
const isCancelConfirmModalOpen = ref(false);

const eventTypes = {
  DAY: "day",
  UPCOMING: "upcoming",
  PAST: "past",
  ALL: null,
};

const categoryTypes = {
  ALL: null,
};

const filter = ref({
  categoryId: categoryTypes.ALL,
  type: eventTypes.ALL,
  date: "",
});

// only call method if and only if isLoading is false
watchEffect(async () => {
  console.log("useAuth.isLoading", isAuthLoading.value);
  if (isAuthLoading.value) {
    return;
  }

  if (!isAuthenticated.value || (isMsalAuthenticated.value && isAdminMsal.value)) {
    setIsLoading(false);
    return;
  }
  const events = await getEvents();
  setEvents(events);
  if (isLecturer.value) {
    categories.value = await getLecturerCategories();
  } else {
    categories.value = await getCategories();
  }
  setIsLoading(false);
});

function setEvents(_events, sort = sortDirections.DESC) {
  const dateExtractor = (event) => event.eventStartTime;

  if (sort === sortDirections.DESC) {
    sortByDateInPlace(_events, dateExtractor, sortDirections.DESC);
  } else {
    sortByDateInPlace(_events, dateExtractor, sortDirections.ASC);
  }

  events.value = _events;
}

const eventToBeDeleted = ref(null);

function startConfirmCancel(event) {
  eventToBeDeleted.value = event;
  isCancelConfirmModalOpen.value = true;
}

async function confirmCancelEvent(event) {
  const isSuccess = await deleteEvent(event.id);
  isCancelConfirmModalOpen.value = false;
  if (isSuccess) {
    events.value = events.value.filter((e) => e.id !== event.id);
    isCancelSuccessModalOpen.value = true;
  } else {
    isCancelErrorModalOpen.value = true;
  }
}

function selectEvent(event) {
  withNoEditing(() => {
    currentEvent.value = event;
  });
}

async function saveEvent(updates, file) {
  const selectedEventId = currentEvent.value.id;

  const newDate = new Date(updates.eventStartTime);
  if ((!isNaN(newDate.getTime()) && newDate.getTime() !== new Date(currentEvent.value.eventStartTime).getTime()) ||
    updates.eventNotes !== undefined && updates.eventNotes !== currentEvent.value.eventNotes ||
    file !== undefined) {
    console.log("updating event");
    console.log(newDate, new Date(currentEvent.value.eventStartTime));
    console.log(updates.eventNotes, currentEvent.value.eventNotes);

    const updatedEvent = await updateEvent(selectedEventId, updates, file);
    if (updatedEvent) {
      const event = events.value.find((e) => e.id === selectedEventId);
      event.eventStartTime = updatedEvent.eventStartTime;
      event.eventNotes = updatedEvent.eventNotes;
      event.bucketUuid = updatedEvent.bucketUuid;
      isEditSuccessModalOpen.value = true;
    } else {
      isEditErrorModalOpen.value = true;
    }
  }

  stopEditing();
}

async function filterEvents() {
  const categoryId = filter.value.categoryId;
  const date = filter.value.date;
  let _type = filter.value.type;
  const _filter: Record<string, unknown> = {
    categoryId,
  };

  // add startAt only if all type is selected
  if (date && _type === eventTypes.ALL) {
    const localDate = `${filter.value.date}T00:00:00`;
    const startAt = new Date(localDate);
    _filter.startAt = startAt.toISOString();
    _type = eventTypes.DAY;
  }

  if (_type !== eventTypes.ALL) {
    _filter.type = _type;
  }

  setIsLoading(true);
  const events = await getEventsByFilter(_filter);
  const ascending = [eventTypes.UPCOMING, eventTypes.DAY];

  if (ascending.includes(_type)) {
    setEvents(events, sortDirections.ASC);
  } else {
    setEvents(events, sortDirections.DESC);
  }

  setIsLoading(false);
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] py-8 px-12">
    <div class="flex flex-col text-slate-700">
      <h1 class="text-4xl font-semibold">
        Events
      </h1>
      <div class="mb-4 flex justify-between">
        <div class="mb-4 mt-2">
          {{ events.length }} events shown
        </div>
        <div class="flex flex-wrap gap-6">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-slate-600">Category</label>
            <select
              v-model="filter.categoryId"
              class="self-baseline rounded-sm border border-gray-200 bg-white p-1 text-sm shadow-md shadow-gray-500/5"
              @change="filterEvents"
            >
              <option :value="categoryTypes.ALL">
                All
              </option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.eventCategoryName }}
              </option>
            </select>
          </div>

          <div class="flex gap-2">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-slate-600">Type</label>
              <select
                v-model="filter.type"
                class="rounded-sm border border-gray-200 bg-white p-1 text-sm shadow-md shadow-gray-500/5"
                @change="filterEvents"
              >
                <option :value="eventTypes.ALL">
                  All
                </option>
                <option :value="eventTypes.UPCOMING">
                  Upcoming
                </option>
                <option :value="eventTypes.PAST">
                  Past
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs text-slate-600">Date</label>
              <input
                v-model="filter.date"
                class="rounded-sm border border-gray-200 bg-white p-1 text-sm shadow-md shadow-gray-500/5 disabled:bg-slate-200 disabled:text-slate-400"
                type="date"
                :disabled="filter.type !== eventTypes.ALL"
                :max="inputConstraits.MAX_DATE"
                @change="filterEvents"
              >
            </div>
          </div>
        </div>
      </div>
      <div class="flex">
        <Table
          :headers="[
            {
              name: 'Name',
              key: 'bookingName',
            },
            {
              name: 'Date & Time',
              key: 'eventStartTime',
            },
            {
              name: 'Category',
              key: 'eventCategory',
            },
          ]"
          :items="events"
          enable-edit
          enable-delete
          :selected-key="currentEvent.id"
          :key-extractor="(event) => event.id"
          :is-loading="isLoading"
          @edit="startEditing"
          @delete="startConfirmCancel"
          @select="selectEvent"
        >
          <template #cell:bookingName="{ item }">
            <span class="font-medium">{{ item.bookingName }}</span>
          </template>

          <template #cell:eventStartTime="{ item }">
            <div class="flex flex-col">
              <span class="">{{ formatDateTime(new Date(item.eventStartTime)) }}</span>
              <span class="text-sm text-slate-500">{{ item.eventDuration }} minutes</span>
            </div>
          </template>

          <template #cell:eventCategory="{ item }">
            <div class="flex">
              <Badge :text="item.eventCategory.eventCategoryName" />
            </div>
          </template>

          <template #empty>
            <span v-if="isAuthenticated || (isMsalAuthenticated && !isAdminMsal)">
              <span v-if="filter.type === eventTypes.UPCOMING">No On-Going or Upcoming Events</span>
              <span v-else-if="filter.type === eventTypes.PAST">No Past Events</span>
              <span v-else>No Scheduled Event</span>
            </span>
            <span v-else-if="isMsalAuthenticated && isAdminMsal">
              Operations not supported yet
            </span>
            <span v-else>
              Please <router-link
                to="/login"
                class="text-sky-500 underline"
              >login</router-link> to view events
            </span>
          </template>
        </Table>

        <div
          v-if="currentEvent.id"
          class="relative w-4/12 bg-slate-100 p-4"
        >
          <EditEvent
            v-if="isEditing"
            class="sticky top-24"
            :current-event="currentEvent"
            @cancel="isEditing = false"
            @save="saveEvent"
          />
          <EventDetails
            v-else
            class="sticky top-24"
            :current-event="currentEvent"
            @close="currentEvent = {}"
          />
        </div>
      </div>
    </div>
  </div>

  <Modal
    title="Success"
    subtitle="Event has been saved"
    :is-open="isEditSuccessModalOpen"
    @close="isEditSuccessModalOpen = false"
  />

  <Modal
    title="Error"
    subtitle="Something went wrong"
    button-text="Try Again"
    :is-open="isEditErrorModalOpen"
    variant="error"
    @close="isEditErrorModalOpen = false"
  />

  <Modal
    title="Success"
    subtitle="Event has been cancelled"
    :is-open="isCancelSuccessModalOpen"
    @close="isCancelSuccessModalOpen = false"
  />

  <Modal
    title="Error"
    subtitle="Something went wrong"
    button-text="Try Again"
    :is-open="isCancelErrorModalOpen"
    variant="error"
    @close="isCancelErrorModalOpen = false"
  />

  <Modal
    title="Are you sure?"
    subtitle="This action cannot be undone"
    type="confirm"
    button-cancel-text="Cancel"
    button-confirm-text="Confirm"
    variant="error"
    :is-open="isCancelConfirmModalOpen"
    @close="isCancelConfirmModalOpen = false"
    @confirm="confirmCancelEvent(eventToBeDeleted)"
  />
</template>

<style scoped>

</style>
