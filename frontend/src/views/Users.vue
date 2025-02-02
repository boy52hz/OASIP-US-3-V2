<script setup>
import { InteractionType } from "@azure/msal-browser";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import EditUser from "../components/EditUser.vue";
import Modal from "../components/Modal.vue";
import Table from "../components/Table.vue";
import { useMsalAuthentication } from "../composables/useMsalAuthentication";
import { tokenRequest } from "../configs/msalAuthConfig";
import { deleteUser, getRoles, getUsers, updateUser } from "../service/api";
import { formatDateTime } from "../utils";
import { useAuth } from "../utils/useAuth";
import { useEditing } from "../utils/useEditing";

const router = useRouter();
const { isAdmin } = useAuth();
const { error, isAdminMsal } = useMsalAuthentication(InteractionType.Silent, tokenRequest);

watch(
  () => error.value,
  (error) => {
    if ((error && !isAdmin.value) || !isAdminMsal.value) {
      router.push({ name: "home" });
    }
  },
);

const users = ref([]);
const roles = ref([]);
const showDetails = ref(false);
const isLoggedIn = ref(true);
const { editingItem: currentUser, withNoEditing, isEditing, startEditing, stopEditing } = useEditing({});

onBeforeMount(async () => {
  users.value = await getUsers({
    onUnauthorized: () => {
      isLoggedIn.value = false;
    },
  }) || [];
  roles.value = await getRoles();
});

function selectUser(user) {
  withNoEditing(() => {
    currentUser.value = user;
  });
}

const headers = computed(() => {
  const parsedHeaders = [
    {
      name: "Name",
      key: "name",
    },
    {
      name: "Email",
      key: "email",
    },
    {
      name: "Role",
      key: "role",
    },
  ];

  if (showDetails.value) {
    parsedHeaders.push(
      {
        name: "Created On",
        key: "createdOn",
      },
      {
        name: "Updated On",
        key: "updatedOn",
      },
    );
  }

  return parsedHeaders;
});

function confirmDeleteUser(user) {
  if (!confirm(`Are you sure you want to delete ${user.name} (${user.email})?`)) {
    return;
  }
  const isSuccess = deleteUser(user.id);
  if (isSuccess) {
    users.value = users.value.filter((u) => u.id !== user.id);
    alert("User deleted successfully");
  } else {
    alert("Failed to delete user");
  }
}

const isEditSuccessModalOpen = ref(false);
const isEditErrorModalOpen = ref(false);

async function saveUser(updates) {
  const updatedUser = await updateUser(currentUser.value.id, updates);
  if (updatedUser) {
    const user = users.value.find((u) => u.id === updatedUser.id);
    user.name = updatedUser.name;
    user.email = updatedUser.email;
    user.role = updatedUser.role;
    user.updatedOn = updatedUser.updatedOn;
    isEditSuccessModalOpen.value = true;
  } else {
    isEditErrorModalOpen.value = true;
  }

  stopEditing();
}
</script>

<template>
  <div class="mx-auto flex max-w-[1440px] py-8 px-12">
    <div class="flex flex-col text-slate-700">
      <h1 class="text-4xl font-semibold">
        Users
      </h1>
      <div class="mb-4 flex justify-between">
        <div class="mb-4 mt-2">
          {{ users.length }} users shown
        </div>
        <div class="flex items-center">
          <label for="showDetails">Show Details</label>
          <input
            id="showDetails"
            v-model="showDetails"
            type="checkbox"
            class="ml-2"
          >
        </div>
      </div>
      <div class="flex">
        <Table
          :headers="headers"
          :items="users"
          enable-edit
          enable-delete
          :selected-key="currentUser.id"
          :key-extractor="(user) => user.id"
          @edit="startEditing"
          @delete="confirmDeleteUser"
          @select="selectUser"
        >
          <template #cell:name="{ item }">
            {{ item.name }}
          </template>
          <template #cell:email="{ item }">
            {{ item.email }}
          </template>
          <template #cell:role="{ item }">
            {{ item.role }}
          </template>
          <template #cell:createdOn="{ item }">
            {{ formatDateTime(new Date(item.createdOn)) }}
          </template>
          <template #cell:updatedOn="{ item }">
            {{ formatDateTime(new Date(item.updatedOn)) }}
          </template>
          <template #empty>
            <span v-if="isLoggedIn">
              No users found
            </span>
            <span v-else>
              Please <router-link
                to="/login"
                class="text-sky-500 underline"
              >login</router-link> to view users
            </span>
          </template>
        </Table>

        <div
          v-if="isEditing"
          class="relative w-4/12 bg-slate-100 p-4"
        >
          <EditUser
            v-if="isEditing"
            class="sticky top-24"
            :current-user="currentUser"
            :roles="roles"
            @cancel="stopEditing"
            @save="saveUser"
          />
        </div>
      </div>
    </div>
  </div>

  <Modal
    title="Success"
    subtitle="User has been saved"
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
</template>

<style scoped>

</style>
