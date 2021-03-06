SHELL	= /bin/sh
CC	= gcc
CWD	= $(shell pwd)
ODIR	= obj

NAME = pgmlab
GSL_VERSION = 1.9
MBED_VERSION = 2.2.1

SHARED_OBJECT_EXTENSION =


CFLAGS	= -fPIC -g
LDFLAGS =
GSL_FLAGS =

ifeq ($(OS),Windows_NT)
    CCFLAGS += -D WIN32
    ifeq ($(PROCESSOR_ARCHITECTURE),AMD64)
        CCFLAGS += -D AMD64
    endif
    ifeq ($(PROCESSOR_ARCHITECTURE),x86)
        CCFLAGS += -D IA32
    endif
else
    UNAME_S := $(shell uname -s)
    ifeq ($(UNAME_S),Linux)
        CCFLAGS += -D LINUX
        LDFLAGS = -shared
        SHARED_OBJECT_EXTENSION = so
        GSL_FLAGS = -rpath=$(CWD)/../external_lib/gsl/lib
    endif
    ifeq ($(UNAME_S),Darwin)
        CCFLAGS += -D OSX
        LDFLAGS = -dynamiclib
        SHARED_OBJECT_EXTENSION = dylib
        RPATH = -install_name ../net/lib/lib$(NAME).$(SHARED_OBJECT_EXTENSION)
    endif
    UNAME_P := $(shell uname -p)
    ifeq ($(UNAME_P),x86_64)
        CCFLAGS += -D AMD64
    endif
    ifneq ($(filter %86,$(UNAME_P)),)
          CCFLAGS += -D IA32
    endif
    ifneq ($(filter arm%,$(UNAME_P)),)
        CCFLAGS += -D ARM
    endif
endif

TARGET		= lib$(NAME).$(SHARED_OBJECT_EXTENSION)
TARGET_PATH	= $(shell pwd)/lib/$(TARGET)

SOURCES	=	src/net.c \
		../resources/make_hash_table/src/perfect.c \
		../resources/make_hash_table/src/lookupa.c \
		../resources/make_hash_table/src/recycle.c \
		../resources/make_hash_table/src/perfhex.c 

_OBJECTS = net.o perfect.o lookupa.o recycle.o perfhex.o hash_graph_node_ids.o
OBJECTS  = $(patsubst %,$(ODIR)/%,$(_OBJECTS)) 

OBJECTS_SHA = ../external_lib/mbedtls-$(MBED_VERSION)/library/md5.o

INCLUDE_GSL = -Wl,$(GSL_FLAGS) -L$(CWD)/../external_lib/gsl/lib -I$(CWD)/../external_lib/gsl/include -lgsl -lgslcblas 

INCLUDE_SHA = -I$(CWD)/../external_lib/mbedtls-$(MBED_VERSION)/include

all: $(TARGET_PATH)

$(TARGET_PATH): folder net.o perfect.o lookupa.o recycle.o perfhex.o hash_graph_node_ids.o
	$(CC) $(CCFLAGS) $(LDFLAGS) $(CFLAGS) $(RPATH) -o lib/$(TARGET) \
	$(OBJECTS) \
	$(OBJECTS_SHA) \
	$(INCLUDE_GSL) \
	-lm \
        -ldl
         

# -w; \

folder:
	mkdir -p obj lib hash_obj; 

net.o: src/net.c 
	$(CC) $(CCFLAGS) $(CFLAGS) -w -c src/net.c -o obj/net.o -Iinclude $(INCLUDE_GSL) -I../resources/make_hash_table/include $(INCLUDE_SHA) 	-DPGMLAB_SO_DIR=\"$(CWD)\"

perfect.o: ../resources/make_hash_table/src/perfect.c
	$(CC) $(CCFLAGS) $(CFLAGS) -c ../resources/make_hash_table/src/perfect.c -o obj/perfect.o -I../resources/make_hash_table/include -w

lookupa.o: ../resources/make_hash_table/src/lookupa.c
	$(CC) $(CCFLAGS) $(CFLAGS) -c ../resources/make_hash_table/src/lookupa.c -o obj/lookupa.o -I../resources/make_hash_table/include -w

recycle.o: ../resources/make_hash_table/src/recycle.c
	$(CC) $(CCFLAGS) $(CFLAGS) -c ../resources/make_hash_table/src/recycle.c -o obj/recycle.o -I../resources/make_hash_table/include -w

perfhex.o: ../resources/make_hash_table/src/perfhex.c
	$(CC) $(CCFLAGS) $(CFLAGS) -c ../resources/make_hash_table/src/perfhex.c -o obj/perfhex.o -I../resources/make_hash_table/include -w

hash_graph_node_ids.o: src/hash_graph_node_ids.c
	$(CC) $(CCFLAGS) $(CFLAGS) -c src/hash_graph_node_ids.c -o obj/hash_graph_node_ids.o -Iinclude -I../resources/make_hash_table/include -w

make install:
	ln -s $(CWD)/lib/$(TARGET) /usr/local/lib/

make uninstall:
	rm /usr/local/lib/$(TARGET)

clean:
	rm -f $(TARGET_PATH) ; \
	rm -f $(OBJECTS);
