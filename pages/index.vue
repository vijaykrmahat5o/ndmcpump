<template>
  <Tutorial/>
</template>

<script>
export default {
  middleware: ['check-auth','auth'],
}
</script>
