#include <unistd.h>
#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <fcntl.h>
#include <time.h> 
#include <sys/random.h>



static uint64_t global_secret;
static pthread_once_t canary_once = PTHREAD_ONCE_INIT;

void canary_init(void){
   int fd = open("/dev/urandom", O_RDONLY );
   ssize_t r = read(fd, &global_secret, sizeof(global_secret)); 
   close(fd);
}


uint64_t canary_deriv(void *frame_addr, void *ret_addr, void *store_addr){

    uint64_t canary = global_secret;
    canary ^= (uint64_t)(uintptr_t)ret_addr;
    canary ^= ((uint64_t)(uintptr_t)frame_addr * 0xdeadbeefcafebabeULL);

    return canary;
}

int main(){
    pthread_once(&canary_once, canary_init);

}







